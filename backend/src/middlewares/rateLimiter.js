/**
 * Rate limiting.
 *
 * Tiers: a broad global limiter, a strict one for credential endpoints, a
 * per-hour cap on uploads, and a limiter for endpoints that send email (so the
 * reset/verification mailers cannot be used to spam a third party).
 *
 * Authenticated callers are keyed by user id so users behind one institutional
 * NAT do not exhaust each other's budget.
 */
const rateLimit = require('express-rate-limit');
const config = require('../config');
const ApiError = require('../utils/ApiError');

const keyGenerator = (req) => (req.user ? `u:${req.user.id}` : `ip:${req.ip}`);

const handler = (req, res, next, options) => {
  next(
    ApiError.tooManyRequests(options.message || 'Too many requests, please try again later', {
      code: 'RATE_LIMIT_EXCEEDED',
      details: { retryAfterSeconds: Math.ceil(options.windowMs / 1000) },
    }),
  );
};

const base = {
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler,
  // Health checks and preflights should never consume budget.
  skip: (req) => req.method === 'OPTIONS' || req.path === '/health' || req.path === '/healthz',
};

const globalLimiter = rateLimit({
  ...base,
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this client, please slow down',
});

/** Login / register / refresh — counts failures hardest. */
const authLimiter = rateLimit({
  ...base,
  windowMs: config.rateLimit.auth.windowMs,
  max: config.rateLimit.auth.max,
  skipSuccessfulRequests: true,
  message: 'Too many authentication attempts. Please wait before trying again',
});

/** Forgot-password / resend-verification — always keyed by IP. */
const emailLimiter = rateLimit({
  ...base,
  windowMs: config.rateLimit.email.windowMs,
  max: config.isProduction ? config.rateLimit.email.max : Math.max(config.rateLimit.email.max, 100),
  keyGenerator: (req) => `ip:${req.ip}`,
  message: 'Too many email requests. Please try again later',
});

const uploadLimiter = rateLimit({
  ...base,
  windowMs: config.rateLimit.upload.windowMs,
  max: config.rateLimit.upload.max,
  message: 'Upload limit reached. Please try again later',
});

/** Comments, posts, messages — throttles spam without blocking normal use. */
const writeLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  max: 30,
  message: 'You are posting too quickly. Please wait a moment',
});

const searchLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  max: 120,
  message: 'Too many search requests',
});

module.exports = {
  globalLimiter,
  authLimiter,
  emailLimiter,
  uploadLimiter,
  writeLimiter,
  searchLimiter,
};
