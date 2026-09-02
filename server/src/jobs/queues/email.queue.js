const { Queue } = require('bullmq');
const connection = require('../../config/redis');

const emailQueue = new Queue('email', { connection });

const queueEmail = async (payload) => {
  await emailQueue.add('send-email', payload, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
};

module.exports = { emailQueue, queueEmail };