const { Op, fn, col, literal } = require('sequelize');
const {
  sequelize,
  Book,
  User,
  BookCopy,
  BorrowRecord,
  Reservation,
  Fine,
} = require('../../database/models');

const getDashboardSummary = async () => {
  const [
    totalBooks,
    totalMembers,
    activeLoans,
    overdueLoans,
    waitingReservations,
    pendingFinesTotal,
    collectedFinesTotal,
    copyTotals,
  ] = await Promise.all([
    Book.count(),
    User.count({ where: { role: 'member' } }),
    BorrowRecord.count({ where: { status: { [Op.in]: ['active', 'overdue'] } } }),
    BorrowRecord.count({ where: { status: { [Op.in]: ['active', 'overdue'] }, dueAt: { [Op.lt]: new Date() } } }),
    Reservation.count({ where: { status: 'waiting' } }),
    Fine.sum('amount', { where: { status: 'pending' } }),
    Fine.sum('amount', { where: { status: 'paid' } }),
    BookCopy.findAll({
      attributes: [
        [fn('COUNT', col('id')), 'totalCopies'],
        [fn('SUM', literal(`CASE WHEN status = 'available' THEN 1 ELSE 0 END`)), 'availableCopies'],
      ],
      raw: true,
    }),
  ]);

  return {
    totalBooks,
    totalMembers,
    activeLoans,
    overdueLoans,
    waitingReservations,
    pendingFinesTotal: Number(pendingFinesTotal) || 0,
    collectedFinesTotal: Number(collectedFinesTotal) || 0,
    totalCopies: Number(copyTotals[0]?.totalCopies) || 0,
    availableCopies: Number(copyTotals[0]?.availableCopies) || 0,
  };
};

const getMostBorrowedBooks = async (limit = 10) => {
  const rows = await BorrowRecord.findAll({
    attributes: [
      [col('copy.book_id'), 'bookId'],
      [fn('COUNT', col('BorrowRecord.id')), 'timesBorrowed'],
    ],
    include: [{ model: BookCopy, as: 'copy', attributes: [] }],
    group: ['copy.book_id'],
    order: [[literal('timesBorrowed'), 'DESC']],
    limit,
    raw: true,
  });

  const bookIds = rows.map((r) => r.bookId);
  const books = await Book.findAll({
    where: { id: bookIds },
    attributes: ['id', 'title', 'isbn', 'coverUrl'],
  });
  const bookById = Object.fromEntries(books.map((b) => [b.id, b]));

  return rows.map((r) => ({
    book: bookById[r.bookId],
    timesBorrowed: Number(r.timesBorrowed),
  }));
};
const getOverdueLoans = async () => {
  return BorrowRecord.findAll({
    where: { status: { [Op.in]: ['active', 'overdue'] }, dueAt: { [Op.lt]: new Date() } },
    include: [
      { model: User, as: 'borrower', attributes: ['id', 'name', 'email'] },
      { model: BookCopy, as: 'copy', include: [{ model: Book, as: 'book', attributes: ['id', 'title'] }] },
    ],
    order: [['dueAt', 'ASC']],
  });
};

const getCirculationStats = async (days = 30) => {
  const since = new Date(Date.now() - days * 86400000);

  const [checkoutsByDay, returnsByDay] = await Promise.all([
    BorrowRecord.findAll({
      attributes: [
        [fn('DATE', col('borrowed_at')), 'date'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: { borrowedAt: { [Op.gte]: since } },
      group: [fn('DATE', col('borrowed_at'))],
      order: [[fn('DATE', col('borrowed_at')), 'ASC']],
      raw: true,
    }),
    BorrowRecord.findAll({
      attributes: [
        [fn('DATE', col('returned_at')), 'date'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: { returnedAt: { [Op.gte]: since } },
      group: [fn('DATE', col('returned_at'))],
      order: [[fn('DATE', col('returned_at')), 'ASC']],
      raw: true,
    }),
  ]);

  return { checkoutsByDay, returnsByDay, periodDays: days };
};

const getFineRevenueReport = async () => {
  const [pending, paid, waived] = await Promise.all([
    Fine.sum('amount', { where: { status: 'pending' } }),
    Fine.sum('amount', { where: { status: 'paid' } }),
    Fine.sum('amount', { where: { status: 'waived' } }),
  ]);

  return {
    pending: Number(pending) || 0,
    collected: Number(paid) || 0,
    waived: Number(waived) || 0,
  };
};

const toCsv = (rows, columns) => {
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const header = columns.map((c) => escape(c.label)).join(',');
  const lines = rows.map((row) => columns.map((c) => escape(c.value(row))).join(','));
  return [header, ...lines].join('\n');
};

const exportOverdueCsv = async () => {
  const overdue = await getOverdueLoans();
  return toCsv(overdue, [
    { label: 'Member Name', value: (r) => r.borrower.name },
    { label: 'Member Email', value: (r) => r.borrower.email },
    { label: 'Book Title', value: (r) => r.copy.book.title },
    { label: 'Due Date', value: (r) => r.dueAt.toISOString().slice(0, 10) },
    { label: 'Days Overdue', value: (r) => Math.ceil((Date.now() - r.dueAt) / 86400000) },
  ]);
};

module.exports = {
  getDashboardSummary,
  getMostBorrowedBooks,
  getOverdueLoans,
  getCirculationStats,
  getFineRevenueReport,
  exportOverdueCsv,
};