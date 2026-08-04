/**
 * /api/v1/admin — SCR-032..038
 *
 * Every route requires authentication plus a capability. Moderators reach the
 * moderation/design-review screens; user, CMS, forum-structure and taxonomy
 * management are admin-only.
 */
const express = require('express');
const controller = require('./admin.controller');
const validator = require('./admin.validator');
const validate = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/authenticate');
const { can, minRole } = require('../../middlewares/authorize');
const { uploadImages } = require('../../middlewares/upload');
const { PERMISSIONS } = require('../../config/permissions');
const { ROLES } = require('../../config/constants');

const router = express.Router();

router.use(authenticate, minRole(ROLES.MODERATOR));

// ── Dashboard (SCR-032) ───────────────────────────────────────────────────
router.get('/dashboard', can(PERMISSIONS.STATS_VIEW), controller.dashboard);

// ── Users (SCR-033) ───────────────────────────────────────────────────────
router.get('/users', can(PERMISSIONS.USER_MANAGE), validate(validator.listUsers), controller.listUsers);
router.get('/users/:id', can(PERMISSIONS.USER_MANAGE), validate(validator.userId), controller.getUser);
router.patch('/users/:id/role', can(PERMISSIONS.ROLE_MANAGE), validate(validator.changeRole), controller.changeRole);
router.patch(
  '/users/:id/status',
  can(PERMISSIONS.USER_MANAGE),
  validate(validator.changeStatus),
  controller.changeStatus,
);
router.post('/users/:id/badges', can(PERMISSIONS.USER_MANAGE), validate(validator.awardBadge), controller.awardBadge);

// ── Designs (SCR-034) ─────────────────────────────────────────────────────
router.get('/designs', can(PERMISSIONS.DESIGN_MODERATE), validate(validator.listDesigns), controller.listDesigns);
router.patch(
  '/designs/:identifier/review',
  can(PERMISSIONS.DESIGN_MODERATE),
  validate(validator.reviewDesign),
  controller.reviewDesign,
);
router.patch(
  '/designs/:identifier/feature',
  can(PERMISSIONS.CONTENT_MANAGE),
  validate(validator.featureDesign),
  controller.featureDesign,
);
// Permanent and irreversible — admin-only, unlike the archive above.
router.delete(
  '/designs/:identifier',
  can(PERMISSIONS.DESIGN_DELETE_ANY),
  validate(validator.deleteDesign),
  controller.deleteDesign,
);

// ── Moderation queue (SCR-035) ────────────────────────────────────────────
router.get(
  '/moderation/reports',
  can(PERMISSIONS.REPORT_HANDLE),
  validate(validator.listReports),
  controller.moderationQueue,
);
router.patch(
  '/moderation/reports/:id/claim',
  can(PERMISSIONS.REPORT_HANDLE),
  validate(validator.userId),
  controller.claimReport,
);
router.patch(
  '/moderation/reports/:id/resolve',
  can(PERMISSIONS.REPORT_HANDLE),
  validate(validator.resolveReport),
  controller.resolveReport,
);
router.post(
  '/moderation/actions',
  can(PERMISSIONS.REPORT_HANDLE),
  validate(validator.moderateEntity),
  controller.moderateEntity,
);

// ── Comments (SCR-036) ────────────────────────────────────────────────────
router.get(
  '/comments',
  can(PERMISSIONS.COMMENT_MODERATE),
  validate(validator.listComments),
  controller.listComments,
);

// ── News & pages (SCR-037) ────────────────────────────────────────────────
router.get('/news', can(PERMISSIONS.CONTENT_MANAGE), controller.listNews);
router.get('/news/:slug', can(PERMISSIONS.CONTENT_MANAGE), controller.getNews);
router.post(
  '/news',
  can(PERMISSIONS.CONTENT_MANAGE),
  uploadImages.single('coverImage'),
  validate(validator.newsBody),
  controller.createNews,
);
router.patch(
  '/news/:slug',
  can(PERMISSIONS.CONTENT_MANAGE),
  uploadImages.single('coverImage'),
  validate(validator.newsUpdate),
  controller.updateNews,
);
router.delete('/news/:slug', can(PERMISSIONS.CONTENT_MANAGE), controller.deleteNews);

router.get('/pages', can(PERMISSIONS.CONTENT_MANAGE), controller.listPages);
router.put('/pages/:slug', can(PERMISSIONS.CONTENT_MANAGE), validate(validator.pageUpsert), controller.upsertPage);
router.delete('/pages/:slug', can(PERMISSIONS.CONTENT_MANAGE), controller.deletePage);

// ── Forum structure (SCR-038) ─────────────────────────────────────────────
router.get('/forum/categories', can(PERMISSIONS.FORUM_MANAGE), controller.listCategories);
router.post(
  '/forum/categories',
  can(PERMISSIONS.FORUM_MANAGE),
  validate(validator.categoryCreate),
  controller.createCategory,
);
router.patch(
  '/forum/categories/:category',
  can(PERMISSIONS.FORUM_MANAGE),
  validate(validator.categoryUpdate),
  controller.updateCategory,
);
router.delete(
  '/forum/categories/:category',
  can(PERMISSIONS.FORUM_MANAGE),
  validate(validator.categoryDelete),
  controller.deleteCategory,
);

// ── Taxonomies, settings, audit ───────────────────────────────────────────
router.put(
  '/taxonomies/:table',
  can(PERMISSIONS.TAXONOMY_MANAGE),
  validate(validator.taxonomyUpsert),
  controller.upsertTaxonomy,
);
router.delete(
  '/taxonomies/:table/:identifier',
  can(PERMISSIONS.TAXONOMY_MANAGE),
  validate(validator.taxonomyDelete),
  controller.deleteTaxonomy,
);

router.get('/settings', can(PERMISSIONS.CONTENT_MANAGE), controller.listSettings);
router.put('/settings/:key', can(PERMISSIONS.CONTENT_MANAGE), validate(validator.setting), controller.updateSetting);

router.get('/audit-logs', can(PERMISSIONS.AUDIT_VIEW), validate(validator.auditLogs), controller.auditLogs);

module.exports = router;
