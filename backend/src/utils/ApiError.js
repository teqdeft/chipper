/**
 * Operational error carrying an HTTP status, a machine-readable code and
 * optional field-level details. The global error handler formats it; anything
 * that is *not* an ApiError is treated as an unexpected failure and masked in
 * production.
 */
const httpStatus = require('./httpStatus');

class ApiError extends Error {
  /**
   * @param {number} statusCode HTTP status
   * @param {string} message Human-readable message (safe to expose)
   * @param {object} [options]
   * @param {string} [options.code] Machine-readable code, e.g. EMAIL_TAKEN
   * @param {Array|object} [options.details] Field errors or extra context
   * @param {boolean} [options.isOperational=true]
   */
  constructor(statusCode, message, { code, details, isOperational = true } = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code || ApiError.defaultCode(statusCode);
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }

  static defaultCode(statusCode) {
    const map = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      413: 'PAYLOAD_TOO_LARGE',
      415: 'UNSUPPORTED_MEDIA_TYPE',
      422: 'VALIDATION_ERROR',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      503: 'SERVICE_UNAVAILABLE',
    };
    return map[statusCode] || 'ERROR';
  }

  static badRequest(message = 'Bad request', opts) {
    return new ApiError(httpStatus.BAD_REQUEST, message, opts);
  }

  static unauthorized(message = 'Authentication required', opts) {
    return new ApiError(httpStatus.UNAUTHORIZED, message, opts);
  }

  static forbidden(message = 'You do not have permission to perform this action', opts) {
    return new ApiError(httpStatus.FORBIDDEN, message, opts);
  }

  static notFound(message = 'Resource not found', opts) {
    return new ApiError(httpStatus.NOT_FOUND, message, opts);
  }

  static conflict(message = 'Resource already exists', opts) {
    return new ApiError(httpStatus.CONFLICT, message, opts);
  }

  static validation(message = 'Validation failed', details) {
    return new ApiError(httpStatus.UNPROCESSABLE_ENTITY, message, {
      code: 'VALIDATION_ERROR',
      details,
    });
  }

  static tooManyRequests(message = 'Too many requests, please try again later', opts) {
    return new ApiError(httpStatus.TOO_MANY_REQUESTS, message, opts);
  }

  static internal(message = 'Something went wrong', opts) {
    return new ApiError(httpStatus.INTERNAL_SERVER_ERROR, message, {
      isOperational: false,
      ...opts,
    });
  }
}

module.exports = ApiError;
