/**
 * Knex configuration.
 *
 * The environment file (.env / .env.production) is resolved by src/config/env.js
 * from NODE_ENV, which the npm scripts set via cross-env. The Knex CLI picks the
 * connection block matching NODE_ENV, so `npm run migrate` and `npm run migrate:prod`
 * hit the right database without any hand-editing.
 */
require('./src/config/env');

const path = require('path');

const base = {
  client: process.env.DB_CLIENT || 'mysql2',
  connection: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
    timezone: 'Z',
    supportBigNumbers: true,
    bigNumberStrings: false,
    dateStrings: false,
    ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
  },
  pool: {
    min: Number(process.env.DB_POOL_MIN || 2),
    max: Number(process.env.DB_POOL_MAX || 10),
    acquireTimeoutMillis: 60000,
    createTimeoutMillis: 30000,
    idleTimeoutMillis: 600000,
    /**
     * Pin every connection's session time zone to UTC.
     *
     * The driver is configured with `timezone: 'Z'`, so it writes and reads
     * DATETIME values as UTC. If the MySQL session ran on server-local time,
     * NOW() would sit hours away from those values — a 30-minute password-reset
     * token would be born already expired on any host that is not on UTC.
     * Forcing +00:00 keeps NOW(), CURRENT_TIMESTAMP and application-supplied
     * dates on one clock.
     */
    afterCreate(connection, done) {
      connection.query("SET time_zone = '+00:00'", (err) => done(err, connection));
    },
  },
  migrations: {
    directory: path.join(__dirname, 'src/database/migrations'),
    tableName: 'knex_migrations',
    extension: 'js',
    disableTransactions: false,
  },
  seeds: {
    directory: path.join(__dirname, 'src/database/seeds'),
  },
  acquireConnectionTimeout: 60000,
  asyncStackTraces: process.env.NODE_ENV !== 'production',
  debug: process.env.DB_DEBUG === 'true',
};

module.exports = {
  development: base,
  test: {
    ...base,
    connection: { ...base.connection, database: `${process.env.DB_NAME}_test` },
  },
  production: {
    ...base,
    pool: { ...base.pool, min: Number(process.env.DB_POOL_MIN || 2), max: Number(process.env.DB_POOL_MAX || 20) },
    asyncStackTraces: false,
  },
};
