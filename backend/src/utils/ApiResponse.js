/**
 * One response envelope for the whole API.
 *
 * Success: { success: true, message, data, meta?, requestId, timestamp }
 * Failure: { success: false, message, error: { code, details? }, requestId, timestamp }
 *
 * The frontend can therefore branch on `success` alone, and paginated lists always
 * carry `meta.pagination`.
 */
const httpStatus = require('./httpStatus');

const envelope = (req, extra) => ({
  requestId: req?.id,
  timestamp: new Date().toISOString(),
  ...extra,
});

const ApiResponse = {
  /** 200 with a payload. */
  success(res, { data = null, message = 'Success', meta, statusCode = httpStatus.OK } = {}) {
    return res.status(statusCode).json(
      envelope(res.req, {
        success: true,
        message,
        data,
        ...(meta ? { meta } : {}),
      }),
    );
  },

  /** 201 for resource creation. */
  created(res, { data = null, message = 'Created successfully', meta } = {}) {
    return ApiResponse.success(res, { data, message, meta, statusCode: httpStatus.CREATED });
  },

  /** 200 list response with pagination meta produced by utils/pagination. */
  paginated(res, { items = [], pagination, message = 'Success', meta = {} } = {}) {
    return ApiResponse.success(res, {
      data: items,
      message,
      meta: { ...meta, pagination },
    });
  },

  /** 204 — no body. */
  noContent(res) {
    return res.status(httpStatus.NO_CONTENT).send();
  },

  /** Used by the global error handler; controllers should throw ApiError instead. */
  error(res, { statusCode = httpStatus.INTERNAL_SERVER_ERROR, message = 'Error', code, details, stack } = {}) {
    return res.status(statusCode).json(
      envelope(res.req, {
        success: false,
        message,
        error: {
          code: code || 'ERROR',
          ...(details ? { details } : {}),
          ...(stack ? { stack } : {}),
        },
      }),
    );
  },
};

module.exports = ApiResponse;
