/**
 * Permission catalogue + role → permission matrix.
 *
 * Routes can guard on a coarse role (`authorize(ROLES.ADMIN)`) or on a fine-grained
 * capability (`can(P.DESIGN_MODERATE)`). Capabilities are preferred: they survive
 * role renames and make the intent of a route obvious at the call site.
 */
const { ROLES } = require('./constants');

const P = Object.freeze({
  // Designs
  DESIGN_CREATE: 'design.create',
  DESIGN_UPDATE_OWN: 'design.update.own',
  DESIGN_DELETE_OWN: 'design.delete.own',
  DESIGN_PUBLISH: 'design.publish',
  DESIGN_DOWNLOAD: 'design.download',
  DESIGN_MODERATE: 'design.moderate',
  /**
   * Permanent removal of anyone's design, files and all. Deliberately kept out
   * of DESIGN_MODERATE: a moderator archives, which is reversible; only an
   * admin destroys.
   */
  DESIGN_DELETE_ANY: 'design.delete.any',

  // Comments / community content
  COMMENT_CREATE: 'comment.create',
  COMMENT_UPDATE_OWN: 'comment.update.own',
  COMMENT_MODERATE: 'comment.moderate',

  // Forum
  FORUM_POST: 'forum.post',
  FORUM_VOTE: 'forum.vote',
  FORUM_MODERATE: 'forum.moderate',
  FORUM_MANAGE: 'forum.manage',

  // Messaging
  MESSAGE_SEND: 'message.send',

  // Moderation
  REPORT_CREATE: 'report.create',
  REPORT_HANDLE: 'report.handle',

  // Admin
  USER_MANAGE: 'user.manage',
  ROLE_MANAGE: 'role.manage',
  CONTENT_MANAGE: 'content.manage',
  TAXONOMY_MANAGE: 'taxonomy.manage',
  STATS_VIEW: 'stats.view',
  AUDIT_VIEW: 'audit.view',

  // Commercial
  LISTING_MANAGE: 'listing.manage',
});

/**
 * What every verified member can do, whatever they signed up as (student,
 * researcher or institution): browse, download, comment, ask, reply, vote and
 * publish their own designs.
 *
 * `user` and `uploader` grant exactly this same set — a new account holds both.
 * The two names are kept apart only because existing rows reference them and
 * because a moderator may still want to name one when demoting someone.
 */
const MEMBER_PERMISSIONS = [
  P.COMMENT_CREATE,
  P.COMMENT_UPDATE_OWN,
  P.FORUM_POST,
  P.FORUM_VOTE,
  P.MESSAGE_SEND,
  P.REPORT_CREATE,
  P.DESIGN_DOWNLOAD,
  P.DESIGN_CREATE,
  P.DESIGN_UPDATE_OWN,
  P.DESIGN_DELETE_OWN,
  P.DESIGN_PUBLISH,
];

const USER_PERMISSIONS = MEMBER_PERMISSIONS;
const UPLOADER_PERMISSIONS = MEMBER_PERMISSIONS;

const COMMERCIAL_PERMISSIONS = [...UPLOADER_PERMISSIONS, P.LISTING_MANAGE];

const MODERATOR_PERMISSIONS = [
  ...UPLOADER_PERMISSIONS,
  P.DESIGN_MODERATE,
  P.COMMENT_MODERATE,
  P.FORUM_MODERATE,
  P.REPORT_HANDLE,
  P.STATS_VIEW,
];

const ADMIN_PERMISSIONS = [
  ...MODERATOR_PERMISSIONS,
  P.DESIGN_DELETE_ANY,
  P.LISTING_MANAGE,
  P.FORUM_MANAGE,
  P.USER_MANAGE,
  P.ROLE_MANAGE,
  P.CONTENT_MANAGE,
  P.TAXONOMY_MANAGE,
  P.AUDIT_VIEW,
];

const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.GUEST]: [],
  [ROLES.USER]: Object.freeze([...new Set(USER_PERMISSIONS)]),
  [ROLES.UPLOADER]: Object.freeze([...new Set(UPLOADER_PERMISSIONS)]),
  [ROLES.COMMERCIAL]: Object.freeze([...new Set(COMMERCIAL_PERMISSIONS)]),
  [ROLES.MODERATOR]: Object.freeze([...new Set(MODERATOR_PERMISSIONS)]),
  [ROLES.ADMIN]: Object.freeze([...new Set(ADMIN_PERMISSIONS)]),
});

/** @returns {string[]} every permission granted to a role name. */
function permissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || [];
}

/** @returns {boolean} whether the role holds the given permission. */
function roleHasPermission(role, permission) {
  return permissionsForRole(role).includes(permission);
}

module.exports = { PERMISSIONS: P, ROLE_PERMISSIONS, permissionsForRole, roleHasPermission };
