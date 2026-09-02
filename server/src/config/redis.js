const IORedis = require('ioredis');
const env = require('./env');
const logger = require('./logger');

const connection = new IORedis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null,
  connectTimeout: 3000,
  enableOfflineQueue: false,
  retryStrategy: () => null,
});

connection.on('error', (err) => {
  logger.error('Redis connection error', { error: err.message });
});

module.exports = connection;