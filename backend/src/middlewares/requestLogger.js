/**
 * HTTP access logging.
 * Success and error responses go to separate morgan instances so 4xx/5xx can be
 * grepped without noise, and health checks are skipped entirely.
 */
const morgan = require('morgan');
const config = require('../config');
const logger = require('../config/logger');

morgan.token('request-id', (req) => req.id || '-');
morgan.token('user-id', (req) => (req.user ? req.user.id : '-'));

const format = config.isProduction
  ? ':remote-addr :method :url :status :res[content-length] - :response-time ms rid=:request-id uid=:user-id'
  : ':method :url :status :response-time ms - :res[content-length] rid=:request-id';

const skipHealth = (req) => req.originalUrl === '/health' || req.originalUrl === '/healthz';

const successLogger = morgan(format, {
  skip: (req, res) => res.statusCode >= 400 || skipHealth(req),
  stream: { write: (msg) => logger.http(msg.trim()) },
});

const errorLogger = morgan(format, {
  skip: (req, res) => res.statusCode < 400,
  stream: { write: (msg) => logger.warn(msg.trim()) },
});

module.exports = [successLogger, errorLogger];
