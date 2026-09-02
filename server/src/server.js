const http = require('http');
const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const { connectDB, sequelize } = require('./config/db');
require('./database/models');
const { startScheduledJobs, runMaintenanceSweep } = require('./jobs/scheduler');
const { initSocket } = require('./sockets/notification.socket');
const { startEmailWorker } = require('./jobs/workers/email.worker');

let server;
let emailWorker;

const start = async () => {
  await connectDB();

  if (env.NODE_ENV === 'development') {
    await sequelize.sync({ alter: true });
    logger.info('🗂️  Models synced (development mode)');
  }

  const httpServer = http.createServer(app);
  initSocket(httpServer);

  server = httpServer.listen(env.PORT, () => {
    logger.info(`🚀 Server listening on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  startScheduledJobs();
  emailWorker = startEmailWorker();
  runMaintenanceSweep().catch((err) => {
    logger.error('Initial maintenance sweep failed', { error: err.message });
  });
};

const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  if (server) {
    server.close(async () => {
      await sequelize.close();
      if (emailWorker) await emailWorker.close();
      logger.info('Closed out remaining connections. Exiting.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason });
});

start().catch((err) => {
  logger.error('Failed to start server', { error: err.message });
  process.exit(1);
});