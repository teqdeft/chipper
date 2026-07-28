/**
 * Role- and permission-based authorization.
 *
 *   authorize(ROLES.ADMIN, ROLES.MODERATOR)   — one of these roles
 *   can(PERMISSIONS.DESIGN_MODERATE)          — holds this capability
 *   minRole(ROLES.UPLOADER)                   — at or above this privilege level
 *   ownerOr(PERMISSIONS.DESIGN_MODERATE, getOwnerId) — resource owner, or a moderator
 */
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ROLE_LEVEL } = require('../config/constants');
const { roleHasPermission } = require('../config/permissions');

function authorize(...roles) {
  const allowed = roles.flat();
  return (req, res, next) => {
    if (!req.user) throw ApiError.unauthorized();
    if (!allowed.includes(req.user.role)) {
      throw ApiError.forbidden('Your role does not allow this action', {
        code: 'ROLE_NOT_ALLOWED',
        details: { required: allowed, current: req.user.role },
      });
    }
    next();
  };
}

function can(...permissions) {
  const required = permissions.flat();
  return (req, res, next) => {
    if (!req.user) throw ApiError.unauthorized();
    const missing = required.filter((p) => !roleHasPermission(req.user.role, p));
    if (missing.length) {
      throw ApiError.forbidden('You do not have permission to perform this action', {
        code: 'PERMISSION_DENIED',
        details: { missing },
      });
    }
    next();
  };
}

function minRole(role) {
  const threshold = ROLE_LEVEL[role] ?? Number.MAX_SAFE_INTEGER;
  return (req, res, next) => {
    if (!req.user) throw ApiError.unauthorized();
    if ((ROLE_LEVEL[req.user.role] ?? -1) < threshold) {
      throw ApiError.forbidden(`This action requires ${role} access or above`, {
        code: 'ROLE_LEVEL_TOO_LOW',
      });
    }
    next();
  };
}

/**
 * Passes when the caller owns the resource OR holds an override permission.
 * @param {string} overridePermission capability that bypasses the ownership check
 * @param {(req:object)=>Promise<number|null>} getOwnerId resolves the resource owner id
 */
function ownerOr(overridePermission, getOwnerId) {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) throw ApiError.unauthorized();
    if (roleHasPermission(req.user.role, overridePermission)) return next();

    const ownerId = await getOwnerId(req);
    if (ownerId === null || ownerId === undefined) throw ApiError.notFound();
    if (Number(ownerId) !== Number(req.user.id)) {
      throw ApiError.forbidden('You can only modify your own content', { code: 'NOT_OWNER' });
    }
    next();
  });
}

module.exports = { authorize, can, minRole, ownerOr };
