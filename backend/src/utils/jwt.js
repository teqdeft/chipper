/**
 * JWT issue / verify helpers.
 *
 * Access tokens are short-lived and stateless. Refresh tokens are long-lived and
 * *stateful*: only a SHA-256 hash is stored in `refresh_tokens`, so a database
 * leak cannot be replayed and a session can be revoked server-side.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');
const ApiError = require('./ApiError');

const baseOptions = {
  issuer: config.jwt.issuer,
  audience: config.jwt.audience,
};

/**
 * @param {{ id:number, uuid:string, role:string, email:string }} user
 * @returns {string} signed access token
 */
function signAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      uuid: user.uuid,
      email: user.email,
      role: user.role,
      type: 'access',
    },
    config.jwt.secret,
    { ...baseOptions, expiresIn: config.jwt.accessExpiresIn },
  );
}

/**
 * @param {{ id:number, uuid:string }} user
 * @param {string} sessionId opaque id linking the token to its refresh_tokens row
 */
function signRefreshToken(user, sessionId) {
  return jwt.sign(
    { sub: String(user.id), uuid: user.uuid, sid: sessionId, type: 'refresh' },
    config.jwt.refreshSecret,
    { ...baseOptions, expiresIn: config.jwt.refreshExpiresIn },
  );
}

function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, config.jwt.secret, baseOptions);
    if (payload.type !== 'access') throw new Error('Wrong token type');
    return payload;
  } catch (err) {
    throw translate(err, 'access');
  }
}

function verifyRefreshToken(token) {
  try {
    const payload = jwt.verify(token, config.jwt.refreshSecret, baseOptions);
    if (payload.type !== 'refresh') throw new Error('Wrong token type');
    return payload;
  } catch (err) {
    throw translate(err, 'refresh');
  }
}

function translate(err, kind) {
  if (err.name === 'TokenExpiredError') {
    return ApiError.unauthorized(`Your ${kind} token has expired`, { code: 'TOKEN_EXPIRED' });
  }
  return ApiError.unauthorized(`Invalid ${kind} token`, { code: 'TOKEN_INVALID' });
}

/** Reads a bearer token from the Authorization header or the refreshToken cookie. */
function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  if (req.cookies && req.cookies.accessToken) return req.cookies.accessToken;
  return null;
}

/** Stable hash used to persist refresh tokens without storing the token itself. */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Cryptographically random, URL-safe token for email verification / password reset. */
function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Numeric one-time passcode sent by email.
 *
 * Returns the fixed development code when OTP_STATIC_ENABLED is on (config
 * refuses to boot with that flag in production), otherwise draws from
 * crypto.randomInt so the code is not predictable from a timestamp or PRNG state.
 *
 * @param {number} [length] digits, defaults to OTP_LENGTH
 */
function generateOtp(length = config.otp.length) {
  if (config.otp.staticEnabled) return config.otp.staticCode;
  const max = 10 ** length;
  return String(crypto.randomInt(0, max)).padStart(length, '0');
}

/** Seconds until a signed token expires — used to set refresh_tokens.expires_at. */
function expiryDate(expiresIn) {
  const match = /^(\d+)([smhd])$/.exec(String(expiresIn));
  const now = Date.now();
  if (!match) return new Date(now + 24 * 60 * 60 * 1000);
  const value = Number(match[1]);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
  return new Date(now + value * unit);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  extractToken,
  hashToken,
  randomToken,
  generateOtp,
  expiryDate,
};
