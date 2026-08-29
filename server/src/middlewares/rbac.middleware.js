const ApiError = require('../utils/ApiError');

// Usage: router.post('/books', authenticate, authorize('admin', 'librarian'), handler)
// Kept separate from `authenticate` so route definitions read declaratively
// and permission logic can evolve (e.g. to permission-based checks) independently.
const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized());
  }
  if (!allowedRoles.includes(req.user.role)) {
    return next(ApiError.forbidden('You do not have permission to perform this action'));
  }
  next();
};

module.exports = authorize;
