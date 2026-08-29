const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

const signAccessToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });

const signRefreshToken = (user) =>
  jwt.sign({ sub: user.id, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });

const verifyAccessToken = (token) => jwt.verify(token, env.JWT_ACCESS_SECRET);
const verifyRefreshToken = (token) => jwt.verify(token, env.JWT_REFRESH_SECRET);

// We never store raw refresh tokens in the DB — only a hash, so a DB leak
// doesn't hand out usable tokens (same principle as password hashing).
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
};
