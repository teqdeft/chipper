/**
 * Winston logger.
 * - Colourised, human-readable output in development.
 * - JSON + daily-rotated files in production (app / error streams).
 */
const fs = require('fs');
const path = require('path');
const winston = require('winston');
require('winston-daily-rotate-file');
const config = require('./index');

const { combine, timestamp, printf, colorize, errors, json, splat } = winston.format;

if (config.log.toFile && !fs.existsSync(config.log.dir)) {
  fs.mkdirSync(config.log.dir, { recursive: true });
}

const consoleFormat = printf(({ level, message, timestamp: ts, stack, requestId, ...meta }) => {
  const rid = requestId ? ` [${requestId}]` : '';
  const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${ts}${rid} ${level}: ${stack || message}${extra}`;
});

const transports = [
  new winston.transports.Console({
    format: config.isProduction
      ? combine(timestamp(), errors({ stack: true }), splat(), json())
      : combine(
          colorize({ all: false }),
          timestamp({ format: 'HH:mm:ss.SSS' }),
          errors({ stack: true }),
          splat(),
          consoleFormat,
        ),
  }),
];

if (config.log.toFile) {
  transports.push(
    new winston.transports.DailyRotateFile({
      dirname: config.log.dir,
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: config.log.maxFiles,
      maxSize: '20m',
      zippedArchive: true,
      format: combine(timestamp(), errors({ stack: true }), splat(), json()),
    }),
    new winston.transports.DailyRotateFile({
      level: 'error',
      dirname: config.log.dir,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: config.log.maxFiles,
      maxSize: '20m',
      zippedArchive: true,
      format: combine(timestamp(), errors({ stack: true }), splat(), json()),
    }),
  );
}

const logger = winston.createLogger({
  level: config.log.level,
  defaultMeta: { service: 'chipper-api', env: config.env },
  transports,
  exitOnError: false,
});

/** morgan writes through this stream so HTTP logs land in the same pipeline. */
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

/** Child logger bound to a request id — used by the request-context middleware. */
logger.forRequest = (requestId) => logger.child({ requestId });

if (config.log.toFile) {
  logger.exceptions.handle(
    new winston.transports.File({ filename: path.join(config.log.dir, 'exceptions.log') }),
  );
}

module.exports = logger;
