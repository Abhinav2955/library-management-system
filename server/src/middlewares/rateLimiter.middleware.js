const rateLimit = require('express-rate-limit');
const env = require('../config/env');

// General API limiter — generous, just a backstop against abuse.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});

// Tighter limiter specifically for auth endpoints (login/register/refresh)
// where brute-force and credential-stuffing attempts actually happen.
const authLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many attempts, please try again later' },
});

module.exports = { apiLimiter, authLimiter };
