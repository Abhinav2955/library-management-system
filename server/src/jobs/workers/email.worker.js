const { Worker } = require('bullmq');
const connection = require('../../config/redis');
const logger = require('../../config/logger');
const { sendEmail } = require('../../services/mailer.service');

const startEmailWorker = () => {
  const worker = new Worker(
    'email',
    async (job) => {
      await sendEmail(job.data);
    },
    { connection, concurrency: 5 }
  );

  worker.on('failed', (job, err) => {
    logger.error(`Email job ${job?.id} failed after retries`, { error: err.message });
  });

  logger.info('📬 Email worker started');
  return worker;
};

module.exports = { startEmailWorker };