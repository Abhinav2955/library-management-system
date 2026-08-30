const { Server } = require('socket.io');
const env = require('../config/env');
const logger = require('../config/logger');
const { verifyAccessToken } = require('../utils/token');
const { setIO } = require('./io');

const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication token missing'));

  try {
    const payload = verifyAccessToken(token);
    socket.userId = payload.sub;
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
};

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: env.CLIENT_ORIGIN, credentials: true },
  });

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
    logger.debug(`Socket connected for user ${socket.userId}`);

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected for user ${socket.userId}`);
    });
  });

  setIO(io);
  logger.info('🔌 Socket.IO initialized');
  return io;
};

module.exports = { initSocket };