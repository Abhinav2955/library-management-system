const cron = require('node-cron');
const { Op } = require('sequelize');
const logger = require('../config/logger');
const { BorrowRecord, BookCopy, Book, User } = require('../database/models');
const reservationService = require('../modules/reservations/reservation.service');
const notificationService = require('../modules/notifications/notification.service');

const flagOverdueLoans = async () => {
  const newlyOverdue = await BorrowRecord.findAll({
    where: { status: 'active', dueAt: { [Op.lt]: new Date() } },
    include: [{ model: BookCopy, as: 'copy', include: [{ model: Book, as: 'book', attributes: ['title'] }] }],
  });

  if (newlyOverdue.length === 0) return 0;

  await BorrowRecord.update(
    { status: 'overdue' },
    { where: { id: newlyOverdue.map((r) => r.id) } }
  );

  for (const record of newlyOverdue) {
    const alreadyNotified = await notificationService.hasExistingNotification({
      userId: record.userId,
      type: 'overdue',
      borrowRecordId: record.id,
    });
    if (!alreadyNotified) {
      await notificationService.createNotification({
        userId: record.userId,
        type: 'overdue',
        message: `"${record.copy?.book?.title || 'A book'}" is now overdue. Please return it as soon as possible.`,
        borrowRecordId: record.id,
      });
    }
  }

  logger.info(`⏰ Flagged ${newlyOverdue.length} loan(s) as overdue`);
  return newlyOverdue.length;
};

const notifyDueSoon = async () => {
  const soon = new Date(Date.now() + 24 * 3600000);
  const dueSoonLoans = await BorrowRecord.findAll({
    where: { status: 'active', dueAt: { [Op.between]: [new Date(), soon] } },
    include: [{ model: BookCopy, as: 'copy', include: [{ model: Book, as: 'book', attributes: ['title'] }] }],
  });

  let notifiedCount = 0;
  for (const record of dueSoonLoans) {
    const alreadyNotified = await notificationService.hasExistingNotification({
      userId: record.userId,
      type: 'due_soon',
      borrowRecordId: record.id,
    });
    if (!alreadyNotified) {
      await notificationService.createNotification({
        userId: record.userId,
        type: 'due_soon',
        message: `"${record.copy?.book?.title || 'A book'}" is due within 24 hours.`,
        borrowRecordId: record.id,
      });
      notifiedCount += 1;
    }
  }

  if (notifiedCount > 0) logger.info(`⏰ Sent ${notifiedCount} due-soon reminder(s)`);
  return notifiedCount;
};

const expireReservationHolds = async () => {
  const count = await reservationService.expireStaleHolds();
  if (count > 0) logger.info(`⏰ Expired ${count} stale reservation hold(s)`);
  return count;
};

const runMaintenanceSweep = async () => {
  const [overdueCount, expiredCount, dueSoonCount] = await Promise.all([
    flagOverdueLoans(),
    expireReservationHolds(),
    notifyDueSoon(),
  ]);
  return { overdueCount, expiredCount, dueSoonCount };
};

const startScheduledJobs = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      await runMaintenanceSweep();
    } catch (err) {
      logger.error('Scheduled maintenance sweep failed', { error: err.message });
    }
  });
  logger.info('⏰ Scheduled jobs registered (hourly: overdue flip, hold expiry, due-soon reminders)');
};

module.exports = {
  startScheduledJobs,
  runMaintenanceSweep,
  flagOverdueLoans,
  expireReservationHolds,
  notifyDueSoon,
};