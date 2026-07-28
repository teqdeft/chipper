/**
 * Centralised, validated application configuration.
 *
 * Nothing else in the codebase reads process.env directly — every module imports
 * from here. That keeps env access typed, validated once at boot, and trivially
 * swappable per environment.
 */
const path = require('path');
const Joi = require('joi');
const { ROOT_DIR, envFile } = require('./env');

const csv = (value, fallback = []) =>
  value
    ? String(value)
        .split(',')
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean)
    : fallback;

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(5000),
  API_PREFIX: Joi.string().default('/api/v1'),
  APP_NAME: Joi.string().default('Chipper'),
  APP_URL: Joi.string().uri().default('http://localhost:5000'),
  CLIENT_URL: Joi.string().uri().default('http://localhost:5173'),
  TRUST_PROXY: Joi.string().optional(),

  DB_CLIENT: Joi.string().default('mysql2'),
  DB_HOST: Joi.string().default('127.0.0.1'),
  DB_PORT: Joi.number().port().default(3306),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').default(''),
  DB_NAME: Joi.string().required(),
  DB_POOL_MIN: Joi.number().default(2),
  DB_POOL_MAX: Joi.number().default(10),
  DB_DEBUG: Joi.boolean().default(false),
  DB_SSL: Joi.boolean().default(false),

  JWT_SECRET: Joi.string().min(8).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('1d'),
  JWT_REFRESH_SECRET: Joi.string().min(8).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),
  JWT_ISSUER: Joi.string().default('chipper.org'),
  JWT_AUDIENCE: Joi.string().default('chipper-web'),

  BCRYPT_SALT_ROUNDS: Joi.number().min(8).max(15).default(10),
  PASSWORD_RESET_EXPIRES_MINUTES: Joi.number().default(60),
  EMAIL_VERIFY_EXPIRES_HOURS: Joi.number().default(48),

  OTP_ENABLED: Joi.boolean().default(true),
  OTP_STATIC_ENABLED: Joi.boolean().default(false),
  OTP_STATIC_CODE: Joi.string().pattern(/^\d{4,10}$/).default('123456'),
  OTP_LENGTH: Joi.number().min(4).max(10).default(6),
  OTP_MAX_ATTEMPTS: Joi.number().min(1).max(20).default(5),

  CORS_ORIGINS: Joi.string().default('*'),
  CORS_CREDENTIALS: Joi.boolean().default(true),

  RATE_LIMIT_WINDOW_MINUTES: Joi.number().default(15),
  RATE_LIMIT_MAX: Joi.number().default(300),
  AUTH_RATE_LIMIT_WINDOW_MINUTES: Joi.number().default(15),
  AUTH_RATE_LIMIT_MAX: Joi.number().default(20),
  UPLOAD_RATE_LIMIT_WINDOW_MINUTES: Joi.number().default(60),
  UPLOAD_RATE_LIMIT_MAX: Joi.number().default(50),

  UPLOAD_DIR: Joi.string().default('uploads'),
  UPLOAD_PUBLIC_PATH: Joi.string().default('/static/uploads'),
  MAX_FILE_SIZE_MB: Joi.number().default(500),
  MAX_IMAGE_SIZE_MB: Joi.number().default(10),
  MAX_AVATAR_SIZE_MB: Joi.number().default(5),
  MAX_ATTACHMENT_SIZE_MB: Joi.number().default(25),
  MAX_FILES_PER_UPLOAD: Joi.number().default(20),
  ALLOWED_DESIGN_EXTENSIONS: Joi.string().default('stl,step,stp,zip,pdf'),
  ALLOWED_IMAGE_EXTENSIONS: Joi.string().default('jpg,jpeg,png,webp'),
  ALLOWED_DOCUMENT_EXTENSIONS: Joi.string().default('pdf,doc,docx,csv,txt'),

  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'http', 'debug').default('info'),
  LOG_DIR: Joi.string().default('logs'),
  LOG_TO_FILE: Joi.boolean().default(true),
  LOG_MAX_FILES: Joi.string().default('14d'),

  MAIL_ENABLED: Joi.boolean().default(false),
  MAIL_HOST: Joi.string().allow('').default(''),
  MAIL_PORT: Joi.number().default(587),
  MAIL_SECURE: Joi.boolean().default(false),
  MAIL_USER: Joi.string().allow('').default(''),
  MAIL_PASSWORD: Joi.string().allow('').default(''),
  MAIL_FROM_NAME: Joi.string().default('Chipper'),
  MAIL_FROM_ADDRESS: Joi.string().default('no-reply@chipper.org'),

  FEATURE_COMMERCIAL: Joi.boolean().default(false),
  FEATURE_REGISTRATION_OPEN: Joi.boolean().default(true),
  FEATURE_REQUIRE_EMAIL_VERIFICATION: Joi.boolean().default(true),
  FEATURE_DESIGN_REVIEW_REQUIRED: Joi.boolean().default(true),
}).unknown(true);

const { value: env, error } = schema.validate(process.env, {
  abortEarly: false,
  stripUnknown: false,
});

if (error) {
  const details = error.details.map((d) => `  · ${d.message}`).join('\n');
  // eslint-disable-next-line no-console
  console.error(`[config] Invalid environment in ${envFile}:\n${details}`);
  process.exit(1);
}

// A fixed, guessable OTP would let anyone verify or reset any account. Refuse to
// boot rather than let the development shortcut reach a live deployment.
if (env.NODE_ENV === 'production' && env.OTP_STATIC_ENABLED) {
  // eslint-disable-next-line no-console
  console.error(
    '[config] OTP_STATIC_ENABLED=true is not allowed in production.\n' +
      '         A static OTP lets anyone verify or reset any account.\n' +
      `         Set OTP_STATIC_ENABLED=false in ${envFile}.`,
  );
  process.exit(1);
}

const MB = 1024 * 1024;
const uploadRoot = path.isAbsolute(env.UPLOAD_DIR)
  ? env.UPLOAD_DIR
  : path.join(ROOT_DIR, env.UPLOAD_DIR);

const config = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
  envFile,
  rootDir: ROOT_DIR,

  app: {
    name: env.APP_NAME,
    port: env.PORT,
    apiPrefix: env.API_PREFIX,
    url: env.APP_URL.replace(/\/$/, ''),
    clientUrl: env.CLIENT_URL.replace(/\/$/, ''),
    trustProxy: env.TRUST_PROXY,
  },

  db: {
    client: env.DB_CLIENT,
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    name: env.DB_NAME,
    poolMin: env.DB_POOL_MIN,
    poolMax: env.DB_POOL_MAX,
    debug: env.DB_DEBUG,
    ssl: env.DB_SSL,
  },

  jwt: {
    secret: env.JWT_SECRET,
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  },

  otp: {
    enabled: env.OTP_ENABLED,
    /** Dev-only shortcut: always issue the same code. Blocked in production above. */
    staticEnabled: env.OTP_STATIC_ENABLED,
    staticCode: env.OTP_STATIC_CODE,
    length: env.OTP_LENGTH,
    maxAttempts: env.OTP_MAX_ATTEMPTS,
  },

  security: {
    bcryptRounds: env.BCRYPT_SALT_ROUNDS,
    passwordResetExpiresMinutes: env.PASSWORD_RESET_EXPIRES_MINUTES,
    emailVerifyExpiresHours: env.EMAIL_VERIFY_EXPIRES_HOURS,
    corsOrigins: env.CORS_ORIGINS === '*' ? '*' : csv(env.CORS_ORIGINS).map((o) => o.replace(/\/$/, '')),
    corsCredentials: env.CORS_CREDENTIALS,
  },

  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
    max: env.RATE_LIMIT_MAX,
    auth: {
      windowMs: env.AUTH_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
      max: env.AUTH_RATE_LIMIT_MAX,
    },
    upload: {
      windowMs: env.UPLOAD_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
      max: env.UPLOAD_RATE_LIMIT_MAX,
    },
  },

  upload: {
    root: uploadRoot,
    publicPath: env.UPLOAD_PUBLIC_PATH,
    maxFileSize: env.MAX_FILE_SIZE_MB * MB,
    maxImageSize: env.MAX_IMAGE_SIZE_MB * MB,
    maxAvatarSize: env.MAX_AVATAR_SIZE_MB * MB,
    maxAttachmentSize: env.MAX_ATTACHMENT_SIZE_MB * MB,
    maxFiles: env.MAX_FILES_PER_UPLOAD,
    designExtensions: csv(env.ALLOWED_DESIGN_EXTENSIONS),
    imageExtensions: csv(env.ALLOWED_IMAGE_EXTENSIONS),
    documentExtensions: csv(env.ALLOWED_DOCUMENT_EXTENSIONS),
    /** Sub-folders under upload.root — keeps user content partitioned by purpose. */
    folders: {
      designs: 'designs',
      images: 'images',
      avatars: 'avatars',
      attachments: 'attachments',
      documents: 'documents',
      news: 'news',
      temp: 'temp',
    },
  },

  log: {
    level: env.LOG_LEVEL,
    dir: path.isAbsolute(env.LOG_DIR) ? env.LOG_DIR : path.join(ROOT_DIR, env.LOG_DIR),
    toFile: env.LOG_TO_FILE,
    maxFiles: env.LOG_MAX_FILES,
  },

  mail: {
    enabled: env.MAIL_ENABLED,
    host: env.MAIL_HOST,
    port: env.MAIL_PORT,
    secure: env.MAIL_SECURE,
    user: env.MAIL_USER,
    password: env.MAIL_PASSWORD,
    fromName: env.MAIL_FROM_NAME,
    fromAddress: env.MAIL_FROM_ADDRESS,
  },

  features: {
    commercial: env.FEATURE_COMMERCIAL,
    registrationOpen: env.FEATURE_REGISTRATION_OPEN,
    requireEmailVerification: env.FEATURE_REQUIRE_EMAIL_VERIFICATION,
    designReviewRequired: env.FEATURE_DESIGN_REVIEW_REQUIRED,
  },
};

module.exports = config;
