const ApiError = require('../utils/ApiError');

// Validates req.body/query/params against a Zod schema shaped like:
// { body: z.object({...}), query: z.object({...}), params: z.object({...}) }
// Any key you omit from the schema is left unvalidated/untouched.
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    const details = result.error.flatten().fieldErrors;
    return next(ApiError.badRequest('Validation failed', details));
  }

  // Overwrite with parsed (and coerced/defaulted) values.
  if (result.data.body) req.body = result.data.body;
  if (result.data.query) req.query = result.data.query;
  if (result.data.params) req.params = result.data.params;

  next();
};

module.exports = validate;
