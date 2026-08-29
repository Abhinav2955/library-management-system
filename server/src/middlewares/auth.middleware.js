const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccessToken } = require('../utils/token');
const { User } = require('../database/models');

// Verifies the access token on protected routes and attaches the
// authenticated user (minus sensitive fields) to req.user.
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    throw ApiError.unauthorized('Access token missing');
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    throw ApiError.unauthorized(
      err.name === 'TokenExpiredError' ? 'Access token expired' : 'Invalid access token'
    );
  }

  const user = await User.findByPk(payload.sub);
  if (!user) {
    throw ApiError.unauthorized('User no longer exists');
  }
  if (user.membershipStatus === 'suspended') {
    throw ApiError.forbidden('Account is suspended');
  }

  req.user = user; // full model instance; controllers use .toSafeJSON() when returning it
  next();
});

module.exports = authenticate;
