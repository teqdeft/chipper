/**
 * Domain constants shared across layers.
 * Values here mirror the DB enum/lookup values — change both together.
 */

/** Platform roles. Order matters: index = privilege level. */
const ROLES = Object.freeze({
  GUEST: 'guest',
  USER: 'user',
  UPLOADER: 'uploader',
  COMMERCIAL: 'commercial',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
});

const ROLE_LEVEL = Object.freeze({
  [ROLES.GUEST]: 0,
  [ROLES.USER]: 10,
  [ROLES.UPLOADER]: 20,
  [ROLES.COMMERCIAL]: 30,
  [ROLES.MODERATOR]: 40,
  [ROLES.ADMIN]: 100,
});

/**
 * Self-declared account type chosen at signup. Profile metadata only — every
 * signup gets the same permissions whichever one is picked. It does decide how
 * a profile is presented: an `institution` page lists its affiliated members.
 */
const ACCOUNT_TYPE = Object.freeze({
  STUDENT: 'student',
  RESEARCHER: 'researcher',
  INSTITUTION: 'institution',
});

const ACCOUNT_TYPES = Object.freeze(Object.values(ACCOUNT_TYPE));

const USER_STATUS = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  BANNED: 'banned',
});

const TOKEN_TYPES = Object.freeze({
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
});

/** Design lifecycle — matches the frontend StatusBadge tones. */
const DESIGN_STATUS = Object.freeze({
  DRAFT: 'draft',
  PENDING: 'pending',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  ARCHIVED: 'archived',
});

const PUBLISH_AS = Object.freeze({
  PERSON: 'person',
  INSTITUTE: 'institute',
  PERSON_FROM_INSTITUTE: 'person_from_institute',
});

/** Uploaded file buckets — drives storage folder + extension whitelist. */
const FILE_KIND = Object.freeze({
  MODEL: 'model',
  DOCUMENT: 'document',
  IMAGE: 'image',
  ARCHIVE: 'archive',
  DATA: 'data',
  OTHER: 'other',
});

/**
 * Cover images per design version: shown beside the 3D model on the design
 * page, and the first is the thumbnail on every browse card. Capped so the
 * media panel stays one hero plus a single row of thumbnails.
 */
const MAX_COVER_IMAGES = 3;

const COMMENT_STATUS = Object.freeze({
  VISIBLE: 'visible',
  HIDDEN: 'hidden',
  REMOVED: 'removed',
});

const TOPIC_TYPE = Object.freeze({
  QUESTION: 'question',
  DISCUSSION: 'discussion',
  ANNOUNCEMENT: 'announcement',
});

const TOPIC_STATUS = Object.freeze({
  OPEN: 'open',
  SOLVED: 'solved',
  LOCKED: 'locked',
});

const REPORT_STATUS = Object.freeze({
  OPEN: 'open',
  REVIEWING: 'reviewing',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
});

/** Entities that can be reported / moderated / linked from a notification. */
const ENTITY_TYPE = Object.freeze({
  DESIGN: 'design',
  DESIGN_COMMENT: 'design_comment',
  FORUM_TOPIC: 'forum_topic',
  FORUM_POST: 'forum_post',
  MESSAGE: 'message',
  USER: 'user',
  NEWS: 'news',
});

const NOTIFICATION_TYPE = Object.freeze({
  DESIGN_COMMENT: 'design_comment',
  DESIGN_APPROVED: 'design_approved',
  DESIGN_REJECTED: 'design_rejected',
  DESIGN_STARRED: 'design_starred',
  DESIGN_DOWNLOADED: 'design_downloaded',
  FORUM_REPLY: 'forum_reply',
  FORUM_MENTION: 'forum_mention',
  FORUM_ANSWER_ACCEPTED: 'forum_answer_accepted',
  MESSAGE_RECEIVED: 'message_received',
  REPORT_RESOLVED: 'report_resolved',
  ROLE_CHANGED: 'role_changed',
  BADGE_EARNED: 'badge_earned',
  WELCOME: 'welcome',
  NEWS_PUBLISHED: 'news_published',
  SYSTEM: 'system',
});

const CONTENT_STATUS = Object.freeze({
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
});

/** Component types drive which type-specific metadata block applies (see PDF spec). */
const COMPONENT_TYPE = Object.freeze({
  ORGAN_CHIP: 'organ-chip',
  FLOW_SENSOR: 'flow-sensor',
  PRESSURE_SENSOR: 'pressure-sensor',
  PUMP: 'pump',
  RESERVOIR: 'reservoir',
  FCB: 'fcb',
  OTHER_MICROFLUIDIC_CHIP: 'other-microfluidic-chip',
  OTHER: 'other',
});

/**
 * Geometry the in-browser viewer (SCR-019) can render today — every one of
 * these has a three.js loader that runs without a server-side conversion.
 *
 * The CAD interchange formats a chip is usually *authored* in (STEP, IGES) and
 * the 2D fabrication formats (DXF, DWG) are deliberately absent: a browser
 * cannot tessellate a B-rep, so those stay download-only until a server-side
 * STEP→glTF step exists. Keep this in sync with the loader map in the
 * frontend's ModelViewer.
 */
const VIEWABLE_MODEL_EXTENSIONS = Object.freeze([
  'stl', '3mf', 'obj', 'ply', 'glb', 'gltf', 'fbx',
  // Toolpaths render as lines rather than surfaces.
  'gcode', 'nc', 'tap', 'ngc', 'cnc',
]);

const SORTABLE_DESIGN_FIELDS = Object.freeze([
  'created_at',
  'updated_at',
  'published_at',
  'title',
  'download_count',
  'star_count',
  'view_count',
  'average_rating',
]);

const PAGINATION = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
});

module.exports = {
  ROLES,
  ROLE_LEVEL,
  ACCOUNT_TYPE,
  ACCOUNT_TYPES,
  USER_STATUS,
  TOKEN_TYPES,
  DESIGN_STATUS,
  PUBLISH_AS,
  FILE_KIND,
  MAX_COVER_IMAGES,
  COMMENT_STATUS,
  TOPIC_TYPE,
  TOPIC_STATUS,
  REPORT_STATUS,
  ENTITY_TYPE,
  NOTIFICATION_TYPE,
  CONTENT_STATUS,
  COMPONENT_TYPE,
  VIEWABLE_MODEL_EXTENSIONS,
  SORTABLE_DESIGN_FIELDS,
  PAGINATION,
};
