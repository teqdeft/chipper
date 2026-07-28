/**
 * Process entry point.
 *
 * Boot order: load env -> validate config -> verify DB and mail -> ensure the
 * upload tree exists -> listen. A failure in any pre-flight step exits non-zero
 * so a supervisor (pm2, systemd, Docker) restarts rather than serving a broken
 * instance.
 *
 *   npm run local      -> NODE_ENV=development, reads .env
 *   npm run production -> NODE_ENV=production,  reads .env.production
 */
require('./config/env');

const fs = require('fs');
const path = require('path');
const config = require('./config');
const logger = require('./config/logger');
const app = require('./app');
const { testConnection, closeConnection } = require('./database/connection');
const mailService = require('./services/mail.service');

let server;
let shuttingDown = false;

/** Creates the upload sub-folders once, so the first upload never races on mkdir. */
function ensureUploadTree() {
  Object.values(config.upload.folders).forEach((folder) => {
    const dir = path.join(config.upload.root, folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
  logger.info(`Upload directory ready — ${config.upload.root}`);
}

async function start() {
  logger.info('────────────────────────────────────────────────');
  logger.info(`${config.app.name} API starting`);
  logger.info(`  environment : ${config.env}`);
  logger.info(`  env file    : ${path.basename(config.envFile)}`);
  logger.info(`  api prefix  : ${config.app.apiPrefix}`);

  await testConnection();
  ensureUploadTree();
  await mailService.verifyTransport();

  server = app.listen(config.app.port, () => {
    logger.info(`  listening   : http://localhost:${config.app.port}${config.app.apiPrefix}`);
    logger.info(`  health      : http://localhost:${config.app.port}/health`);
    logger.info('────────────────────────────────────────────────');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${config.app.port} is already in use`);
      process.exit(1);
    }
    throw err;
  });

  // Slowloris protection.
  server.headersTimeout = 65000;
  server.requestTimeout = 300000; // large uploads need room
  server.keepAliveTimeout = 60000;
}

/** Stops accepting connections, drains in-flight requests, then closes the pool. */
async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received — shutting down gracefully`);

  const forceExit = setTimeout(() => {
    logger.error('Forced shutdown after 15s timeout');
    process.exit(1);
  }, 15000);
  forceExit.unref();

  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      logger.info('HTTP server closed');
    }
    await closeConnection();
    clearTimeout(forceExit);
    process.exit(exitCode);
  } catch (err) {
    logger.error(`Error during shutdown: ${err.message}`);
    process.exit(1);
  }
}

['SIGTERM', 'SIGINT'].forEach((signal) => process.on(signal, () => shutdown(signal)));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: reason?.message || reason, stack: reason?.stack });
  shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  shutdown('uncaughtException', 1);
});

start().catch((err) => {
  logger.error(`Failed to start: ${err.message}`, { stack: err.stack });
  process.exit(1);
});
