const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const { connectDB, sequelize } = require('./config/db');
require('./database/models'); // ensures associations are registered

let server;

const start = async () => {
  await connectDB();

  // In development this keeps the schema in sync without migrations.
  // Production should rely on `npm run migrate` instead of sync().
  if (env.NODE_ENV === 'development') {
    await sequelize.sync({ alter: true });
    logger.info('🗂️  Models synced (development mode)');
  }

  server = app.listen(env.PORT, () => {
    logger.info(`🚀 Server listening on port ${env.PORT} [${env.NODE_ENV}]`);
  });
};

// Graceful shutdown: stop accepting new connections, let in-flight
// requests finish, then close the DB pool before exiting.
const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  if (server) {
    server.close(async () => {
      await sequelize.close();
      logger.info('Closed out remaining connections. Exiting.');
      process.exit(0);
    });
    // Force-exit if something hangs.
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
