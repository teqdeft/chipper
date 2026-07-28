/**
 * Single shared Knex instance.
 *
 * Every repository imports this — never construct another connection pool.
 * `db.transaction(cb)` is the unit of work boundary used by services.
 */
const knex = require('knex');
const knexConfig = require('../../knexfile');
const config = require('../config');
const logger = require('../config/logger');

const db = knex(knexConfig[config.env] || knexConfig.development);

if (config.db.debug) {
  db.on('query', (q) => logger.debug(`[sql] ${q.sql} ${JSON.stringify(q.bindings || [])}`));
  db.on('query-error', (err, q) => logger.error(`[sql-error] ${q.sql}`, { error: err.message }));
}

/** Verifies the pool can reach MySQL. Called once during boot. */
async function testConnection() {
  await db.raw('SELECT 1 AS ok');
  logger.info(`Database connected — ${config.db.name}@${config.db.host}:${config.db.port}`);
}

async function closeConnection() {
  await db.destroy();
  logger.info('Database pool closed');
}

module.exports = { db, testConnection, closeConnection };
