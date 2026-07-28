/**
 * Wraps an async route handler so a rejected promise reaches Express' error
 * pipeline instead of hanging the request.
 *
 *   router.get('/', asyncHandler(controller.list));
 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
