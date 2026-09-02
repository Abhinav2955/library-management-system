const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { User, RefreshToken } = require('../../database/models');
const ApiError = require('../../utils/ApiError');
const env = require('../../config/env');
const logger = require('../../config/logger');
const { queueEmail } = require('../../jobs/queues/email.queue');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} = require('../../utils/token');

const SALT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

const msFromExpiry = (expiresIn) => {
  // supports simple formats like '15m', '7d', '1h'
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) return 15 * 60 * 1000;
  const value = Number(match[1]);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
  return value * unit;
};

// Belt-and-suspenders alongside the Redis client's own connectTimeout/
// enableOfflineQueue settings (see config/redis.js) — guarantees a queueing
// attempt can never stall a register/login/reset request beyond 2 seconds,
// regardless of what state the Redis connection is in.
const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Email queue timed out')), ms)),
  ]);

const issueTokenPair = async (user, meta = {}) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await RefreshToken.create({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + msFromExpiry(env.JWT_REFRESH_EXPIRES_IN)),
    userAgent: meta.userAgent || null,
    ipAddress: meta.ipAddress || null,
  });

  return { accessToken, refreshToken };
};

// Only the hash is ever stored (same principle as password/refresh-token
// hashing) — the raw token exists only in the emailed link, so a database
// leak alone can't be used to verify someone else's account.
const sendVerificationEmail = async (user) => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  user.emailVerificationTokenHash = hashToken(rawToken);
  user.emailVerificationExpires = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_MS);
  await user.save();

  const link = `${env.FRONTEND_URL}/verify-email?token=${rawToken}`;
  try {
    await withTimeout(
      queueEmail({
        to: user.email,
        subject: 'Verify your Athenaeum account',
        html: `<p>Hi ${user.name},</p>
          <p>Welcome to Athenaeum Library. Please verify your email to complete your registration:</p>
          <p><a href="${link}">${link}</a></p>
          <p>This link expires in 24 hours.</p>`,
      }),
      2000
    );
  } catch (err) {
    // Registration itself should still succeed even if the email queue is
    // unreachable (e.g. Redis not running locally) — the person can request
    // a fresh link later via /auth/resend-verification.
    logger.error('Failed to queue verification email', { error: err.message });
  }
};

const register = async ({ name, email, password, phone }) => {
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email, passwordHash, phone, role: 'member' });

  await sendVerificationEmail(user);

  return user;
};

const verifyEmail = async (rawToken) => {
  const tokenHash = hashToken(rawToken);
  const user = await User.findOne({
    where: { emailVerificationTokenHash: tokenHash, emailVerificationExpires: { [Op.gt]: new Date() } },
  });

  if (!user) {
    throw ApiError.badRequest('This verification link is invalid or has expired');
  }

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpires = null;
  await user.save();

  return user;
};

const resendVerificationEmail = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) throw ApiError.notFound('User not found');
  if (user.isEmailVerified) {
    throw ApiError.badRequest('This email is already verified');
  }

  await sendVerificationEmail(user);
};

const login = async ({ email, password }, meta = {}) => {
  const user = await User.findOne({ where: { email } });

  // Same error for "no user" and "wrong password" — don't reveal which one it was.
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil - new Date()) / 60000);
    throw ApiError.forbidden(`Account temporarily locked. Try again in ${minutesLeft} minute(s)`);
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (user.membershipStatus === 'suspended') {
    throw ApiError.forbidden('Your account has been suspended. Contact the library.');
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  await user.save();

  const tokens = await issueTokenPair(user, meta);
  return { user, ...tokens };
};

// Rotation with reuse detection: every refresh issues a brand-new refresh token
// and revokes the old one. If a token that's already revoked/replaced is
// presented again, that's a strong signal it was stolen — so we revoke the
// entire token family (every token for that user) and force re-login.
const refresh = async (rawToken, meta = {}) => {
  if (!rawToken) throw ApiError.unauthorized('Refresh token missing');

  let payload;
  try {
    payload = verifyRefreshToken(rawToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const tokenHash = hashToken(rawToken);
  const stored = await RefreshToken.findOne({ where: { userId: payload.sub, tokenHash } });

  if (!stored) {
    throw ApiError.unauthorized('Refresh token not recognized');
  }

  if (stored.revokedAt) {
    // Reuse of a revoked token — nuke every active session for this user.
    await RefreshToken.update(
      { revokedAt: new Date() },
      { where: { userId: payload.sub, revokedAt: { [Op.is]: null } } }
    );
    throw ApiError.unauthorized('Refresh token reuse detected — all sessions revoked');
  }

  if (stored.expiresAt < new Date()) {
    throw ApiError.unauthorized('Refresh token expired');
  }

  const user = await User.findByPk(payload.sub);
  if (!user) throw ApiError.unauthorized('User no longer exists');

  const { accessToken, refreshToken: newRefreshToken } = await issueTokenPair(user, meta);

  const newStored = await RefreshToken.findOne({
    where: { userId: user.id, tokenHash: hashToken(newRefreshToken) },
  });
  stored.revokedAt = new Date();
  stored.replacedByTokenId = newStored.id;
  await stored.save();

  return { user, accessToken, refreshToken: newRefreshToken };
};

const logout = async (rawToken) => {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);
  await RefreshToken.update(
    { revokedAt: new Date() },
    { where: { tokenHash, revokedAt: { [Op.is]: null } } }
  );
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findByPk(userId);
  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();

  // Changing password revokes all existing sessions — standard security hygiene.
  await RefreshToken.update(
    { revokedAt: new Date() },
    { where: { userId, revokedAt: { [Op.is]: null } } }
  );
};

// Deliberately never reveals whether the email exists — the response is
// identical either way, so this endpoint can't be used to enumerate
// registered accounts.
const forgotPassword = async (email) => {
  const user = await User.findOne({ where: { email } });
  if (!user) return; // silent no-op — same response as the success path

  const rawToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetTokenHash = hashToken(rawToken);
  user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);
  await user.save();

  const link = `${env.FRONTEND_URL}/reset-password?token=${rawToken}`;
  try {
    await withTimeout(
      queueEmail({
        to: user.email,
        subject: 'Reset your Athenaeum password',
        html: `<p>Hi ${user.name},</p>
          <p>We received a request to reset your password. This link expires in 1 hour:</p>
          <p><a href="${link}">${link}</a></p>
          <p>If you didn't request this, you can safely ignore this email.</p>`,
      }),
      2000
    );
  } catch (err) {
    logger.error('Failed to queue password reset email', { error: err.message });
  }
};

const resetPassword = async (rawToken, newPassword) => {
  const tokenHash = hashToken(rawToken);
  const user = await User.findOne({
    where: { passwordResetTokenHash: tokenHash, passwordResetExpires: { [Op.gt]: new Date() } },
  });

  if (!user) {
    throw ApiError.badRequest('This password reset link is invalid or has expired');
  }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.passwordResetTokenHash = null;
  user.passwordResetExpires = null;
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  await user.save();

  // A password reset is exactly the kind of event that should kill every
  // existing session — same reasoning as changePassword above.
  await RefreshToken.update(
    { revokedAt: new Date() },
    { where: { userId: user.id, revokedAt: { [Op.is]: null } } }
  );
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  changePassword,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
};