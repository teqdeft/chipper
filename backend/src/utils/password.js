/** Password hashing + strength policy. */
const bcrypt = require('bcryptjs');
const config = require('../config');

/** @returns {Promise<string>} bcrypt hash at the configured cost. */
async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(config.security.bcryptRounds);
  return bcrypt.hash(plain, salt);
}

/**
 * Constant-time comparison. Returns false (never throws) when the stored hash is
 * missing, so callers can treat "no password set" as a failed login.
 */
async function comparePassword(plain, hash) {
  if (!plain || !hash) return false;
  return bcrypt.compare(plain, hash);
}

/**
 * Minimum policy enforced at the validator layer; exposed here so the same rule
 * can be reused by admin-side password resets.
 * @returns {{ valid:boolean, errors:string[] }}
 */
function checkStrength(password) {
  const errors = [];
  if (!password || password.length < 8) errors.push('Password must be at least 8 characters long');
  if (!/[a-z]/.test(password)) errors.push('Password must contain a lowercase letter');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain an uppercase letter');
  if (!/\d/.test(password)) errors.push('Password must contain a number');
  return { valid: errors.length === 0, errors };
}

module.exports = { hashPassword, comparePassword, checkStrength };
