/**
 * Environment file loader.
 *
 * Must be required BEFORE anything that reads process.env.
 *
 *   NODE_ENV=production -> .env.production
 *   anything else       -> .env
 *
 * The npm scripts set NODE_ENV through cross-env:
 *   npm run local      -> NODE_ENV=development -> .env
 *   npm run production -> NODE_ENV=production  -> .env.production
 *
 * An explicit ENV_FILE=/path/to/file overrides the mapping (useful for CI / docker).
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ROOT_DIR = path.resolve(__dirname, '../..');

const FILE_BY_ENV = {
  production: '.env.production',
  test: '.env.test',
  development: '.env',
};

function resolveEnvFile() {
  if (process.env.ENV_FILE) {
    return path.isAbsolute(process.env.ENV_FILE)
      ? process.env.ENV_FILE
      : path.join(ROOT_DIR, process.env.ENV_FILE);
  }
  const nodeEnv = process.env.NODE_ENV || 'development';
  const fileName = FILE_BY_ENV[nodeEnv] || '.env';
  const resolved = path.join(ROOT_DIR, fileName);

  // Fall back to .env when an env-specific file is not present (e.g. .env.test).
  if (!fs.existsSync(resolved) && fs.existsSync(path.join(ROOT_DIR, '.env'))) {
    return path.join(ROOT_DIR, '.env');
  }
  return resolved;
}

const envFile = resolveEnvFile();

if (!fs.existsSync(envFile)) {
  // eslint-disable-next-line no-console
  console.error(
    `[env] Environment file not found: ${envFile}\n` +
      `      Copy .env.example to ${path.basename(envFile)} and fill in the values.`,
  );
  process.exit(1);
}

const result = dotenv.config({ path: envFile });

if (result.error) {
  // eslint-disable-next-line no-console
  console.error(`[env] Failed to parse ${envFile}:`, result.error.message);
  process.exit(1);
}

// NODE_ENV inside the file is authoritative only when it was not already set by the script.
process.env.NODE_ENV = process.env.NODE_ENV || result.parsed.NODE_ENV || 'development';

module.exports = {
  ROOT_DIR,
  envFile,
  loadedKeys: Object.keys(result.parsed || {}),
};
