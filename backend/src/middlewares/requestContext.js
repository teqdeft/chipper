/**
 * Attaches a correlation id + a request-scoped logger to every request.
 * The id is echoed in the response envelope and the X-Request-Id header, so a
 * client-reported failure can be traced straight to its log lines.
 */
const crypto = require('crypto');
const logger = require('../config/logger');

module.exports = function requestContext(req, res, next) {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  req.startedAt = process.hrtime.bigint();
  req.logger = logger.forRequest(req.id);
  res.setHeader('X-Request-Id', req.id);
  next();
};
