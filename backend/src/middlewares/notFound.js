/** Terminal 404 handler for unmatched routes — forwards to the error handler. */
const ApiError = require('../utils/ApiError');

module.exports = function notFound(req, res, next) {
  next(
    ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`, {
      code: 'ROUTE_NOT_FOUND',
    }),
  );
};
