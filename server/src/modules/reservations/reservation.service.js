const { Op } = require('sequelize');
const { Reservation, Book, BookCopy, sequelize } = require('../../database/models');
const ApiError = require('../../utils/ApiError');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination');
const notificationService = require('../notifications/notification.service');

const HOLD_DURATION_HOURS = 48;
const addHours = (date, hours) => new Date(date.getTime() + hours * 3600000);

const createReservation = async (userId, bookId) => {
  const book = await Book.findByPk(bookId);
  if (!book) throw ApiError.notFound('Book not found');

  const existing = await Reservation.findOne({
    where: { userId, bookId, status: { [Op.in]: ['waiting', 'ready'] } },
  });
  if (existing) {
    throw ApiError.conflict('You already have an active reservation for this book');
  }

  return Reservation.create({ userId, bookId, requestedAt: new Date(), status: 'waiting' });
};

// Called from borrow.service.returnBook (same transaction) whenever a copy
// frees up. If someone is waiting, the copy goes to them (status 'reserved',
// held exclusively) instead of back into the general 'available' pool.
const tryFulfillNextReservation = async (bookId, copy, transaction) => {
  const next = await Reservation.findOne({
    where: { bookId, status: 'waiting' },
    order: [['requestedAt', 'ASC']],
    lock: transaction.LOCK.UPDATE,
    transaction,
  });

  if (!next) return false; // no one waiting — copy stays available

  const now = new Date();
  copy.status = 'reserved';
  copy.reservedForUserId = next.userId;
  await copy.save({ transaction });

  next.copyId = copy.id;
  next.status = 'ready';
  next.readyAt = now;
  next.expiresAt = addHours(now, HOLD_DURATION_HOURS);
  await next.save({ transaction });
  const book = await Book.findByPk(bookId, { attributes: ['title'], transaction });
  await notificationService.createNotification(
    {
      userId: next.userId,
      type: 'reservation_ready',
      message: `Your hold on "${book?.title || 'a book'}" is ready — pick it up within 48 hours.`,
    },
    transaction
  );
  return true;
};

const hasWaitingReservations = async (bookId) => {
  const count = await Reservation.count({ where: { bookId, status: 'waiting' } });
  return count > 0;
};

const cancelReservation = async (id, requestingUser) => {
  return sequelize.transaction(async (t) => {
    const reservation = await Reservation.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!reservation) throw ApiError.notFound('Reservation not found');

    if (
      reservation.userId !== requestingUser.id &&
      !['admin', 'librarian'].includes(requestingUser.role)
    ) {
      throw ApiError.forbidden('You can only cancel your own reservation');
    }
    if (!['waiting', 'ready'].includes(reservation.status)) {
      throw ApiError.badRequest('Only waiting or ready reservations can be cancelled');
    }

    const wasReady = reservation.status === 'ready';
    reservation.status = 'cancelled';
    await reservation.save({ transaction: t });

    if (wasReady && reservation.copyId) {
      const copy = await BookCopy.findByPk(reservation.copyId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      copy.reservedForUserId = null;
      const fulfilled = await tryFulfillNextReservation(reservation.bookId, copy, t);
      if (!fulfilled) {
        copy.status = 'available';
        await copy.save({ transaction: t });
      }
    }

    return reservation;
  });
};

const listMyReservations = async (userId, query) => {
  const { page, limit, offset } = parsePagination(query);
  const { rows, count } = await Reservation.findAndCountAll({
    where: { userId },
    include: [{ model: Book, as: 'book' }],
    order: [['requestedAt', 'DESC']],
    limit,
    offset,
  });

  const withPosition = await Promise.all(
    rows.map(async (r) => {
      if (r.status !== 'waiting') return { ...r.toJSON(), queuePosition: null };
      const ahead = await Reservation.count({
        where: { bookId: r.bookId, status: 'waiting', requestedAt: { [Op.lt]: r.requestedAt } },
      });
      return { ...r.toJSON(), queuePosition: ahead + 1 };
    })
  );

  return { reservations: withPosition, meta: buildPaginationMeta({ page, limit, total: count }) };
};

const listAllReservations = async (query) => {
  const { page, limit, offset } = parsePagination(query);
  const where = {};
  if (query.status) where.status = query.status;
  if (query.bookId) where.bookId = query.bookId;

  const { rows, count } = await Reservation.findAndCountAll({
    where,
    include: [{ model: Book, as: 'book' }],
    order: [['requestedAt', 'ASC']],
    limit,
    offset,
  });

  return { reservations: rows, meta: buildPaginationMeta({ page, limit, total: count }) };
};

const expireStaleHolds = async () => {
  const expired = await Reservation.findAll({ where: { status: 'ready', expiresAt: { [Op.lt]: new Date() } } });
  for (const reservation of expired) {
    await sequelize.transaction(async (t) => {
      reservation.status = 'expired';
      await reservation.save({ transaction: t });

      const copy = await BookCopy.findByPk(reservation.copyId, { transaction: t, lock: t.LOCK.UPDATE });
      if (copy) {
        copy.reservedForUserId = null;
        const fulfilled = await tryFulfillNextReservation(reservation.bookId, copy, t);
        if (!fulfilled) {
          copy.status = 'available';
          await copy.save({ transaction: t });
        }
      }
    });
  }
  return expired.length;
};

module.exports = {
  createReservation,
  tryFulfillNextReservation,
  hasWaitingReservations,
  cancelReservation,
  listMyReservations,
  listAllReservations,
  expireStaleHolds,
};