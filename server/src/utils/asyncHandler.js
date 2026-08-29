// Wraps an async route handler so any rejected promise / thrown error
// is forwarded to Express's error-handling middleware automatically.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
