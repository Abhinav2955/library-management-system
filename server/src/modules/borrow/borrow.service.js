const { Op } = require('sequelize');
const { BookCopy, BorrowRecord, Book, User, Reservation, sequelize } = require('../../database/models');
const ApiError = require('../../utils/ApiError');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination');
const reservationService = require('../reservations/reservation.service');
const fineService = require('../fines/fine.service');
const notificationService = require('../notifications/notification.service');


const LOAN_PERIOD_DAYS = 14;
const MAX_RENEWALS = 2;
const MAX_ACTIVE_LOANS_PER_USER = 5;

const addDays = (date, days) => new Date(date.getTime() + days * 86400000);

const addCopies = async ({ bookId, shelfLocation, quantity }) => {
  const book = await Book.findByPk(bookId);
  if (!book) throw ApiError.notFound('Book not found');

  return sequelize.transaction(async (t) => {
    const copies = [];
    for (let i = 0; i < quantity; i += 1) {
      const barcode = `${book.isbn}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      copies.push(await BookCopy.create({ bookId, barcode, shelfLocation }, { transaction: t }));
    }
    book.totalCopies += quantity;
    book.availableCopies += quantity;
    await book.save({ transaction: t });
    return copies;
  });
};

// The core "who gets the last copy" problem: two requests can both read
// availableCopies > 0 before either commits. We lock a specific available
// row (FOR UPDATE SKIP LOCKED-style via Sequelize's `lock`) inside a
// transaction so only one request can claim any given copy — the second
// concurrent request simply finds no lockable row left and fails cleanly
// instead of over-issuing the same book.
const checkout = async (requestingUser, { bookId, userId }) => {
  const borrowerId = userId || requestingUser.id;

  if (userId && userId !== requestingUser.id && !['admin', 'librarian'].includes(requestingUser.role)) {
    throw ApiError.forbidden('Only staff can check out books on behalf of another member');
  }

  return sequelize.transaction(async (t) => {
    const borrower = await User.findByPk(borrowerId, { transaction: t });
    if (!borrower) throw ApiError.notFound('Member not found');
    if (borrower.membershipStatus !== 'active') {
      throw ApiError.forbidden('This membership is not active');
    }

    const activeLoanCount = await BorrowRecord.count({
      where: { userId: borrowerId, status: { [Op.in]: ['active', 'overdue'] } },
      transaction: t,
    });
    if (activeLoanCount >= MAX_ACTIVE_LOANS_PER_USER) {
      throw ApiError.badRequest(`Member has reached the ${MAX_ACTIVE_LOANS_PER_USER}-loan limit`);
    }

    await fineService.assertCheckoutNotBlocked(borrowerId);

    const alreadyHasThisBook = await BorrowRecord.findOne({
      where: { userId: borrowerId, status: { [Op.in]: ['active', 'overdue'] } },
      include: [{ model: BookCopy, as: 'copy', where: { bookId }, required: true }],
      transaction: t,
    });
    if (alreadyHasThisBook) {
      throw ApiError.conflict('This member already has a copy of this book checked out');
    }

    // If this member has a fulfilled hold waiting for them (from the
    // reservation queue), that specific copy is exclusively theirs — check
    // it out ahead of the general 'available' pool and close out the hold.
    const readyReservation = await Reservation.findOne({
      where: { userId: borrowerId, bookId, status: 'ready' },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    let copy;
    if (readyReservation) {
      copy = await BookCopy.findOne({
        where: { id: readyReservation.copyId, status: 'reserved', reservedForUserId: borrowerId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (copy) {
        readyReservation.status = 'fulfilled';
        await readyReservation.save({ transaction: t });
        copy.reservedForUserId = null;
      }
    }

    if (!copy) {
      copy = await BookCopy.findOne({
        where: { bookId, status: 'available' },
        lock: t.LOCK.UPDATE,
        skipLocked: true,
        transaction: t,
      });
    }

    if (!copy) {
      throw ApiError.conflict('No available copies of this book right now');
    }

    copy.status = 'borrowed';
    await copy.save({ transaction: t });

    const book = await Book.findByPk(bookId, { transaction: t });
    book.availableCopies = Math.max(0, book.availableCopies - 1);
    await book.save({ transaction: t });

    const now = new Date();
    const record = await BorrowRecord.create(
      {
        copyId: copy.id,
        userId: borrowerId,
        borrowedAt: now,
        dueAt: addDays(now, LOAN_PERIOD_DAYS),
        status: 'active',
      },
      { transaction: t }
    );

    return record;
  });
};

const returnBook = async (recordId) => {
  return sequelize.transaction(async (t) => {
    const record = await BorrowRecord.findByPk(recordId, {
      include: [{ model: BookCopy, as: 'copy' }],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!record) throw ApiError.notFound('Borrow record not found');
    if (record.status === 'returned') throw ApiError.badRequest('This item was already returned');

    const now = new Date();
    const wasOverdue = now > record.dueAt;

    record.returnedAt = now;
    record.status = 'returned';
    await record.save({ transaction: t });

    // Give the freed copy to the next person in the reservation queue, if any,
    // instead of unconditionally releasing it back to general availability.
    const fulfilled = await reservationService.tryFulfillNextReservation(
      record.copy.bookId,
      record.copy,
      t
    );
    if (!fulfilled) {
      record.copy.status = 'available';
      await record.copy.save({ transaction: t });
    }

    const book = await Book.findByPk(record.copy.bookId, { transaction: t });
    if (!fulfilled) {
      book.availableCopies = Math.min(book.totalCopies, book.availableCopies + 1);
      await book.save({ transaction: t });
    }

    // Fine creation happens right here, inside the same transaction as the
    // return, so a fine and its triggering overdue return are always
    // consistent with each other (no partial-write window between them).
        if (wasOverdue) {
      const fine = await fineService.createFineForOverdueReturn(record, t);
      await notificationService.createNotification(
        {
          userId: record.userId,
          type: 'fine_issued',
          message: `A fine of $${fine.amount} was applied for returning a book late.`,
          borrowRecordId: record.id,
        },
        t
      );
    }

    return { record, wasOverdue };
  });
};

const renew = async (recordId, requestingUser) => {
  const record = await BorrowRecord.findByPk(recordId, { include: [{ model: BookCopy, as: 'copy' }] });
  if (!record) throw ApiError.notFound('Borrow record not found');

  if (record.userId !== requestingUser.id && !['admin', 'librarian'].includes(requestingUser.role)) {
    throw ApiError.forbidden('You can only renew your own loans');
  }
  if (record.status !== 'active') {
    throw ApiError.badRequest('Only active loans can be renewed');
  }
  if (record.renewedCount >= MAX_RENEWALS) {
    throw ApiError.badRequest(`This loan has already been renewed the maximum of ${MAX_RENEWALS} times`);
  }

  const bookId = record.copy.bookId;
  if (await reservationService.hasWaitingReservations(bookId)) {
    throw ApiError.badRequest('This book has a reservation queue and cannot be renewed');
  }

  record.dueAt = addDays(record.dueAt, LOAN_PERIOD_DAYS);
  record.renewedCount += 1;
  await record.save();
  return record;
};

const listMyLoans = async (userId, query) => {
  const { page, limit, offset } = parsePagination(query);
  const where = { userId };
  if (query.status) where.status = query.status;

  const { rows, count } = await BorrowRecord.findAndCountAll({
    where,
    include: [{ model: BookCopy, as: 'copy', include: [{ model: Book, as: 'book' }] }],
    order: [['borrowedAt', 'DESC']],
    limit,
    offset,
  });

  return { records: rows, meta: buildPaginationMeta({ page, limit, total: count }) };
};

const listAllRecords = async (query) => {
  const { page, limit, offset } = parsePagination(query);
  const where = {};
  if (query.status) where.status = query.status;
  if (query.userId) where.userId = query.userId;

  const { rows, count } = await BorrowRecord.findAndCountAll({
    where,
    include: [
      { model: BookCopy, as: 'copy', include: [{ model: Book, as: 'book' }] },
      { model: User, as: 'borrower', attributes: ['id', 'name', 'email'] },
    ],
    order: [['borrowedAt', 'DESC']],
    limit,
    offset,
  });

  return { records: rows, meta: buildPaginationMeta({ page, limit, total: count }) };
};
const listCopiesForBook = async (bookId) => {
  return BookCopy.findAll({ where: { bookId }, order: [['createdAt', 'ASC']] });
};

// Permanently retires a copy (lost or destroyed beyond repair). Only allowed
// from 'available' — a copy that's out on loan or held for a reservation
// must come back through the normal return flow first, so this can't be used
// to silently erase an active loan's target copy.
const retireCopy = async (copyId) => {
  return sequelize.transaction(async (t) => {
    const copy = await BookCopy.findByPk(copyId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!copy) throw ApiError.notFound('Copy not found');
    if (copy.status !== 'available') {
      throw ApiError.badRequest('Only an available copy can be retired — it must be returned first');
    }

    copy.status = 'lost';
    await copy.save({ transaction: t });

    const book = await Book.findByPk(copy.bookId, { transaction: t });
    book.totalCopies = Math.max(0, book.totalCopies - 1);
    book.availableCopies = Math.max(0, book.availableCopies - 1);
    await book.save({ transaction: t });

    return copy;
  });
};
module.exports = {
  addCopies,
  listCopiesForBook,
  retireCopy,
  checkout,
  returnBook,
  renew,
  listMyLoans,
  listAllRecords,
};