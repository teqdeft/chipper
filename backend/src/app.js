/**
 * Express application assembly.
 *
 * Middleware order matters and is deliberate:
 *   1. trust proxy            — correct req.ip behind nginx, for rate limits
 *   2. request context        — correlation id, request-scoped logger
 *   3. security               — helmet, cors, hpp
 *   4. body parsing           — json/urlencoded/cookies, with size caps
 *   5. compression + logging
 *   6. rate limiting
 *   7. sanitisation
 *   8. static uploads         — read-only, no directory listing
 *   9. routes
 *  10. 404 + global error handler (always last)
 */
const path = require('path');
const express = require('express');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const config = require('./config');
const requestContext = require('./middlewares/requestContext');
const requestLogger = require('./middlewares/requestLogger');
const { helmetMiddleware, corsMiddleware, hppMiddleware } = require('./middlewares/security');
const { globalLimiter } = require('./middlewares/rateLimiter');
const { sanitizeRequest } = require('./middlewares/sanitize');
const errorHandler = require('./middlewares/errorHandler');
const notFound = require('./middlewares/notFound');
const ApiResponse = require('./utils/ApiResponse');
const routes = require('./routes');

const app = express();

// 1. Behind a reverse proxy the client IP arrives in X-Forwarded-For.
if (config.app.trustProxy) app.set('trust proxy', config.app.trustProxy);
app.disable('x-powered-by');
app.set('json spaces', config.isProduction ? 0 : 2);

// 2. Correlation id + request logger
app.use(requestContext);

// 3. Security
app.use(helmetMiddleware);
app.use(corsMiddleware);

// 4. Body parsing — multipart is handled per-route by Multer.
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());
app.use(hppMiddleware);

// 5. Compression + access logs
app.use(compression());
app.use(requestLogger);

// 6. Rate limiting
app.use(globalLimiter);

// 7. Input sanitisation
app.use(sanitizeRequest);

// 8. Uploaded files. Served read-only with a long cache; the download *gate*
//    lives on /designs/:id/download — this path serves images and public assets.
app.use(
  config.upload.publicPath,
  express.static(config.upload.root, {
    index: false,
    dotfiles: 'deny',
    maxAge: config.isProduction ? '30d' : 0,
    etag: true,
    setHeaders: (res) => {
      // Never let a stored file be interpreted as markup.
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    },
  }),
);

// ── Health checks (before rate-limited routes for uptime probes) ──────────
const health = async (req, res) => {
  const { db } = require('./database/connection');
  let database = 'up';
  try {
    await db.raw('SELECT 1');
  } catch {
    database = 'down';
  }

  const healthy = database === 'up';
  return res.status(healthy ? 200 : 503).json({
    success: healthy,
    status: healthy ? 'ok' : 'degraded',
    service: `${config.app.name} API`,
    environment: config.env,
    uptime: Math.round(process.uptime()),
    checks: { database },
    timestamp: new Date().toISOString(),
  });
};

app.get('/health', health);
app.get('/healthz', health);

// 9. API routes
app.use(config.app.apiPrefix, routes);

app.get('/', (req, res) =>
  ApiResponse.success(res, {
    data: {
      name: `${config.app.name} API`,
      environment: config.env,
      apiPrefix: config.app.apiPrefix,
      health: '/health',
    },
    message: 'Chipper API is running',
  }),
);

// Serve the API reference document when present.
app.use('/docs', express.static(path.join(config.rootDir, 'docs'), { index: 'API.md' }));

// 10. Fallbacks
app.use(notFound);
app.use(errorHandler);

module.exports = app;
