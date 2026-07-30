/** Small, dependency-light helpers used across services. */
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/** URL-safe slug: "Alveolar barrier · dual channel" -> "alveolar-barrier-dual-channel". */
function slugify(input, { maxLength = 180 } = {}) {
  return String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}

/**
 * Reduces a free-text affiliation to a comparable key, so the "University of
 * Twente" a student types matches the institution account of the same name:
 * "The University of Twente." and "university of twente" both become
 * "university of twente".
 *
 * Deliberately conservative — case, accents, punctuation, spacing and a leading
 * "the" only. Anything cleverer (abbreviations, dropping "BV"/"Inc") would start
 * merging institutions that are genuinely different.
 *
 * @returns {string|null} null when there is nothing left to match on.
 */
function normalizeAffiliation(input) {
  const key = String(input || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^the\s+/, '')
    .replace(/\s+/g, ' ')
    .slice(0, 190);
  return key || null;
}

/**
 * Appends -2, -3 … until the slug is free.
 * @param {string} base
 * @param {(slug:string)=>Promise<boolean>} exists
 */
async function uniqueSlug(base, exists) {
  const root = slugify(base) || crypto.randomBytes(4).toString('hex');
  let candidate = root;
  let n = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await exists(candidate)) {
    candidate = `${root}-${n}`;
    n += 1;
  }
  return candidate;
}

/** Derives a unique @handle from a display name. */
async function uniqueHandle(name, exists) {
  const root =
    slugify(name, { maxLength: 40 }).replace(/-/g, '.') || `user${crypto.randomBytes(3).toString('hex')}`;
  let candidate = root;
  let n = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await exists(candidate)) {
    candidate = `${root}${n}`;
    n += 1;
  }
  return candidate;
}

const uuid = () => uuidv4();

/** Removes undefined keys so Knex does not write NULLs over existing values. */
function pruneUndefined(obj = {}) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

/** Picks a subset of keys — used to build safe update payloads. */
function pick(obj = {}, keys = []) {
  return keys.reduce((acc, key) => {
    if (obj[key] !== undefined) acc[key] = obj[key];
    return acc;
  }, {});
}

/** Drops keys from an object (e.g. password_hash before serialising a user). */
function omit(obj = {}, keys = []) {
  const set = new Set(keys);
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !set.has(k)));
}

/** MySQL JSON columns come back as strings on some driver versions — normalise. */
function parseJson(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/** Turns "1,2,3" or ["1","2"] into a clean array — for repeatable query filters. */
function toArray(value) {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) return value.flatMap((v) => toArray(v));
  return String(value)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

/** Escapes %, _ and \ so user input cannot broaden a LIKE pattern. */
function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Semantic-ish version bump used when publishing a new design version. */
function nextVersion(current = 'v1.0', bump = 'minor') {
  const match = /^v?(\d+)\.(\d+)(?:\.(\d+))?$/.exec(String(current).trim());
  if (!match) return 'v1.0';
  let [, major, minor] = match.map(Number);
  if (bump === 'major') {
    major += 1;
    minor = 0;
  } else {
    minor += 1;
  }
  return `v${major}.${minor}`;
}

/** Extracts @handles from a body so mentions can be notified. */
function extractMentions(text = '') {
  const matches = String(text).match(/@([a-zA-Z0-9._-]{2,40})/g) || [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

/** "2.4 MB" for API responses that mirror the frontend file list. */
function formatBytes(bytes) {
  const size = Number(bytes) || 0;
  if (size === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** i;
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  slugify,
  normalizeAffiliation,
  uniqueSlug,
  uniqueHandle,
  uuid,
  pruneUndefined,
  pick,
  omit,
  parseJson,
  toArray,
  escapeLike,
  nextVersion,
  extractMentions,
  formatBytes,
  sleep,
};
