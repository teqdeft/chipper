/**
 * JWT authentication.
 *
 * `authenticate`         — token required; 401 without a valid one.
 * `optionalAuthenticate` — attaches req.user when a token is present, otherwise
 *                          continues as a guest (used by public design/forum reads
 *                          that still want "did I star this?" style personalisation).
 *
 * The token payload is never trusted on its own: the user row is re-read so a
 * suspended/banned/deleted account loses access immediately, without waiting for
 * the access token to expire.
 */
const { verifyAccessToken, extractToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { USER_STATUS } = require('../config/constants');
const { permissionsForRole } = require('../config/permissions');
const userRepository = require('../modules/users/user.repository');

async function resolveUser(token) {
  const payload = verifyAccessToken(token);
  const user = await userRepository.findAuthById(payload.sub);

  if (!user || user.deleted_at) {
    throw ApiError.unauthorized('Account no longer exists', { code: 'ACCOUNT_NOT_FOUND' });
  }
  if (user.status === USER_STATUS.BANNED) {
    throw ApiError.forbidden('This account has been banned', { code: 'ACCOUNT_BANNED' });
  }
  if (user.status === USER_STATUS.SUSPENDED) {
    throw ApiError.forbidden('This account is suspended', { code: 'ACCOUNT_SUSPENDED' });
  }

  return {
    id: user.id,
    uuid: user.uuid,
    email: user.email,
    name: user.name,
    handle: user.handle,
    role: user.role,
    status: user.status,
    emailVerifiedAt: user.email_verified_at,
    permissions: permissionsForRole(user.role),
  };
}

const authenticate = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    throw ApiError.unauthorized('Authentication token is missing', { code: 'TOKEN_MISSING' });
  }
  req.user = await resolveUser(token);
  next();
});

const optionalAuthenticate = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    req.user = await resolveUser(token);
  } catch {
    // A bad token on a public route degrades to guest access rather than failing.
    req.user = undefined;
  }
  next();
});

/** Blocks actions that require a confirmed email address (e.g. uploading). */
const requireVerifiedEmail = (req, res, next) => {
  const config = require('../config');
  if (!config.features.requireEmailVerification) return next();
  if (!req.user) throw ApiError.unauthorized();
  if (!req.user.emailVerifiedAt) {
    throw ApiError.forbidden('Please verify your email address to continue', {
      code: 'EMAIL_NOT_VERIFIED',
    });
  }
  next();
};

module.exports = { authenticate, optionalAuthenticate, requireVerifiedEmail };
