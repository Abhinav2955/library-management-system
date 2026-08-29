const { Op } = require('sequelize');
const { Fine, sequelize } = require('../../database/models');
const ApiError = require('../../utils/ApiError');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination');

const FINE_RATE_PER_DAY = 0.5; // $0.50/day overdue
const FINE_CAP = 20.0; // never charge more than this per loan
const MAX_UNPAID_BALANCE_FOR_CHECKOUT = 10.0; // blocks new checkouts above this balance

const msPerDay = 86400000;

// Called from borrow.service.returnBook (same transaction) whenever a book
// comes back late. Keeps fine math out of the circulation service entirely.
const createFineForOverdueReturn = async (record, transaction) => {
  const daysLate = Math.ceil((record.returnedAt - record.dueAt) / msPerDay);
  const amount = Math.min(daysLate * FINE_RATE_PER_DAY, FINE_CAP).toFixed(2);

  return Fine.create(
    {
      userId: record.userId,
      borrowRecordId: record.id,
      amount,
      reason: `Overdue return — ${daysLate} day(s) late`,
      status: 'pending',
    },
    { transaction }
  );
};

const getPendingBalance = async (userId) => {
  const result = await Fine.sum('amount', { where: { userId, status: 'pending' } });
  return Number(result) || 0;
};

// Used by borrow.service.checkout to enforce "settle your fines before you
// borrow more" — a real, commonly-enforced library policy.
const assertCheckoutNotBlocked = async (userId) => {
  const balance = await getPendingBalance(userId);
  if (balance > MAX_UNPAID_BALANCE_FOR_CHECKOUT) {
    throw ApiError.forbidden(
      `Outstanding fines of $${balance.toFixed(2)} exceed the $${MAX_UNPAID_BALANCE_FOR_CHECKOUT.toFixed(2)} limit for new checkouts`
    );
  }
};

const payFine = async (fineId, requestingUser) => {
  return sequelize.transaction(async (t) => {
    const fine = await Fine.findByPk(fineId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!fine) throw ApiError.notFound('Fine not found');

    if (fine.userId !== requestingUser.id && !['admin', 'librarian'].includes(requestingUser.role)) {
      throw ApiError.forbidden('You can only pay your own fines');
    }
    if (fine.status !== 'pending') {
      throw ApiError.badRequest('This fine is not pending payment');
    }

    // A real deployment plugs a payment gateway (Stripe/Razorpay) in here —
    // charge `fine.amount`, verify the webhook/response, then mark paid.
    // Kept as a direct status flip so the ledger and API contract are ready
    // for that integration without changing the interface.
    fine.status = 'paid';
    fine.paidAt = new Date();
    await fine.save({ transaction: t });
    return fine;
  });
};

const waiveFine = async (fineId, staffUser, reason) => {
  const fine = await Fine.findByPk(fineId);
  if (!fine) throw ApiError.notFound('Fine not found');
  if (fine.status !== 'pending') {
    throw ApiError.badRequest('Only pending fines can be waived');
  }

  fine.status = 'waived';
  fine.waivedByUserId = staffUser.id;
  fine.waivedReason = reason;
  await fine.save();
  return fine;
};

const listMyFines = async (userId, query) => {
  const { page, limit, offset } = parsePagination(query);
  const where = { userId };
  if (query.status) where.status = query.status;

  const { rows, count } = await Fine.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  const pendingBalance = await getPendingBalance(userId);
  return { fines: rows, pendingBalance, meta: buildPaginationMeta({ page, limit, total: count }) };
};

const listAllFines = async (query) => {
  const { page, limit, offset } = parsePagination(query);
  const where = {};
  if (query.status) where.status = query.status;
  if (query.userId) where.userId = query.userId;

  const { rows, count } = await Fine.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return { fines: rows, meta: buildPaginationMeta({ page, limit, total: count }) };
};

module.exports = {
  createFineForOverdueReturn,
  getPendingBalance,
  assertCheckoutNotBlocked,
  payFine,
  waiveFine,
  listMyFines,
  listAllFines,
};