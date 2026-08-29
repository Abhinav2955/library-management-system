const env = require('../config/env');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');

// 404 handler for unmatched routes — placed after all routers.
const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

// Single place that shapes every error response the API sends.
// Operational errors (ApiError) are trusted; anything else is logged as a bug
// and masked in production so internals never leak to clients.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let { statusCode, message, details } = err;

  if (!(err instanceof ApiError)) {
    statusCode = 500;
    message = env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
    details = null;
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
  } else if (statusCode >= 500) {
    logger.error(err.message, { stack: err.stack });
  } else {
    logger.warn(err.message, { path: req.originalUrl, statusCode });
  }

  res.status(statusCode || 500).json({
    success: false,
    message: message || 'Something went wrong',
    ...(details ? { details } : {}),
    ...(env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};

module.exports = { notFoundHandler, errorHandler };
