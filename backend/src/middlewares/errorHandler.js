/**
 * Global error handling — the single place that turns a thrown error into a
 * response. Anything that is not an operational ApiError is logged with its
 * stack and masked behind a generic 500 in production.
 */
const multer = require('multer');
const Joi = require('joi');
const config = require('../config');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const httpStatus = require('../utils/httpStatus');
const { cleanupFiles } = require('./upload');

/** MySQL driver errors → meaningful HTTP responses. */
function fromDatabaseError(err) {
  switch (err.code) {
    case 'ER_DUP_ENTRY': {
      const match = /for key '(?:.*\.)?(.+?)'/.exec(err.sqlMessage || '');
      return ApiError.conflict('A record with these details already exists', {
        code: 'DUPLICATE_ENTRY',
        details: match ? { constraint: match[1] } : undefined,
      });
    }
    case 'ER_NO_REFERENCED_ROW':
    case 'ER_NO_REFERENCED_ROW_2':
      return ApiError.badRequest('A referenced record does not exist', { code: 'FOREIGN_KEY_INVALID' });
    case 'ER_ROW_IS_REFERENCED':
    case 'ER_ROW_IS_REFERENCED_2':
      return ApiError.conflict('This record is still referenced by other data and cannot be deleted', {
        code: 'FOREIGN_KEY_CONSTRAINT',
      });
    case 'ER_DATA_TOO_LONG':
      return ApiError.badRequest('One of the submitted values is too long', { code: 'VALUE_TOO_LONG' });
    case 'ER_BAD_NULL_ERROR':
      return ApiError.badRequest('A required value is missing', { code: 'NULL_NOT_ALLOWED' });
    case 'ECONNREFUSED':
    case 'PROTOCOL_CONNECTION_LOST':
    case 'ER_CON_COUNT_ERROR':
      return new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'The database is unavailable, please retry shortly', {
        code: 'DB_UNAVAILABLE',
        isOperational: false,
      });
    default:
      return null;
  }
}

/** Multer errors → 400/413 with the limit that was hit. */
function fromMulterError(err) {
  const map = {
    LIMIT_FILE_SIZE: [
      httpStatus.PAYLOAD_TOO_LARGE,
      `File is too large. Maximum size is ${Math.round(config.upload.maxFileSize / (1024 * 1024))} MB`,
    ],
    LIMIT_FILE_COUNT: [httpStatus.BAD_REQUEST, `Too many files. Maximum is ${config.upload.maxFiles}`],
    LIMIT_UNEXPECTED_FILE: [httpStatus.BAD_REQUEST, `Unexpected file field "${err.field}"`],
    LIMIT_PART_COUNT: [httpStatus.BAD_REQUEST, 'Too many parts in the upload'],
    LIMIT_FIELD_KEY: [httpStatus.BAD_REQUEST, 'A field name is too long'],
    LIMIT_FIELD_VALUE: [httpStatus.BAD_REQUEST, 'A field value is too long'],
    LIMIT_FIELD_COUNT: [httpStatus.BAD_REQUEST, 'Too many fields in the upload'],
  };
  const [status, message] = map[err.code] || [httpStatus.BAD_REQUEST, 'File upload failed'];
  return new ApiError(status, message, { code: err.code });
}

/** Normalises any thrown value into an ApiError. */
function normalise(err) {
  if (err instanceof ApiError) return err;
  if (err instanceof multer.MulterError) return fromMulterError(err);
  if (Joi.isError && Joi.isError(err)) {
    return ApiError.validation(
      'The submitted data is not valid',
      err.details.map((d) => ({ field: d.path.join('.'), message: d.message })),
    );
  }
  if (err.type === 'entity.parse.failed') {
    return ApiError.badRequest('Malformed JSON in the request body', { code: 'INVALID_JSON' });
  }
  if (err.type === 'entity.too.large') {
    return new ApiError(httpStatus.PAYLOAD_TOO_LARGE, 'Request body is too large', {
      code: 'PAYLOAD_TOO_LARGE',
    });
  }
  if (err.code) {
    const dbError = fromDatabaseError(err);
    if (dbError) return dbError;
  }
  return new ApiError(err.statusCode || httpStatus.INTERNAL_SERVER_ERROR, err.message || 'Something went wrong', {
    isOperational: false,
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const error = normalise(err);

  // A failed request must not leave orphaned bytes on disk.
  if (req.file || req.files) {
    const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [req.file];
    cleanupFiles(files).catch(() => {});
  }

  const log = req.logger || logger;
  const context = {
    method: req.method,
    url: req.originalUrl,
    statusCode: error.statusCode,
    code: error.code,
    userId: req.user ? req.user.id : null,
    ip: req.ip,
  };

  if (!error.isOperational || error.statusCode >= 500) {
    log.error(`Unhandled error: ${err.message}`, { ...context, stack: err.stack });
  } else if (error.statusCode >= 400) {
    log.warn(`${error.code}: ${error.message}`, context);
  }

  const exposeMessage = error.isOperational || !config.isProduction;

  return ApiResponse.error(res, {
    statusCode: error.statusCode,
    message: exposeMessage ? error.message : 'An unexpected error occurred. Please try again later',
    code: error.code,
    details: error.details,
    stack: config.isProduction ? undefined : err.stack,
  });
}

module.exports = errorHandler;
