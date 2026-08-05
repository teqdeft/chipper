/**
 * Security middleware bundle: Helmet, CORS, HPP, payload hardening.
 * Applied once in app.js before any route.
 */
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const config = require('../config');
const ApiError = require('../utils/ApiError');

/** Helmet with a CSP that still allows the static upload host to serve files. */
const helmetMiddleware = helmet({
  contentSecurityPolicy: config.isProduction
    ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'", config.app.clientUrl],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: [],
        },
      }
    : false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: config.isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
});

/** Origin whitelist from CORS_ORIGINS; `*` disables the check (dev only). */
const corsMiddleware = cors({
  origin(origin, callback) {
    const allowed = config.security.corsOrigins;
    // Same-origin / server-to-server requests carry no Origin header.
    if (!origin) return callback(null, true);
    // Temporary: in development, reflect any Origin so tunnels / LAN always work.
    if (!config.isProduction) return callback(null, true);
    if (allowed === '*') return callback(null, true);
    if (allowed.includes(origin.toLowerCase().replace(/\/$/, ''))) return callback(null, true);
    return callback(ApiError.forbidden(`Origin ${origin} is not allowed by CORS`, { code: 'CORS_BLOCKED' }));
  },
  credentials: config.security.corsCredentials,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id', 'Accept'],
  exposedHeaders: ['X-Request-Id', 'Content-Disposition', 'X-Total-Count'],
  maxAge: 86400,
});

/** Prevents parameter pollution (?sortBy=a&sortBy=b) except where repeats are meaningful. */
const hppMiddleware = hpp({
  whitelist: ['organ', 'organs', 'material', 'materials', 'tag', 'tags', 'status', 'componentType', 'license'],
});

module.exports = { helmetMiddleware, corsMiddleware, hppMiddleware };
