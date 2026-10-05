const AppError = require('../utils/AppError');

// Middleware factory that validates request body, query, or params with a Zod schema
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const issues = result.error.issues || result.error.errors || [];
      const formattedErrors = issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      // Use the specific field error as primary message for immediate clarity
      const primaryMessage = formattedErrors[0]?.message || 'Validation failed';
      const error = new AppError(primaryMessage, 400, 'VALIDATION_ERROR');
      error.errors = formattedErrors;
      return next(error);
    }

    // Assign sanitized & parsed data back to req
    req[source] = result.data;
    next();
  };
};

module.exports = validate;
