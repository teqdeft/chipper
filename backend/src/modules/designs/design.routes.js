/**
 * /api/v1/designs — SCR-017..023
 *
 * Reads use optionalAuthenticate so guests can browse while signed-in users get
 * personalised flags (isStarred, canEdit). Writes require an account, a verified
 * email and the matching capability.
 */
const express = require('express');
const controller = require('./design.controller');
const validator = require('./design.validator');
const validate = require('../../middlewares/validate');
const { authenticate, optionalAuthenticate, requireVerifiedEmail } = require('../../middlewares/authenticate');
const { can } = require('../../middlewares/authorize');
const { uploadDesignFiles } = require('../../middlewares/upload');
const { uploadLimiter, writeLimiter, searchLimiter } = require('../../middlewares/rateLimiter');
const { PERMISSIONS } = require('../../config/permissions');

const router = express.Router();

// ── Own designs — before /:identifier so "mine" is not read as a slug ─────
router.get('/mine', authenticate, validate(validator.listMine), controller.listMine);

// ── Create ────────────────────────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  requireVerifiedEmail,
  can(PERMISSIONS.DESIGN_CREATE),
  writeLimiter,
  validate(validator.create),
  controller.create,
);

// ── Browse ────────────────────────────────────────────────────────────────
router.get('/', optionalAuthenticate, searchLimiter, validate(validator.browse), controller.browse);

// ── Single design ─────────────────────────────────────────────────────────
router.get('/:identifier', optionalAuthenticate, validate(validator.detail), controller.detail);
router.get('/:identifier/versions', optionalAuthenticate, validate(validator.versions), controller.versions);
router.get('/:identifier/viewer', optionalAuthenticate, validate(validator.detail), controller.viewer);
router.get('/:identifier/related', optionalAuthenticate, validate(validator.remove), controller.related);

router.patch(
  '/:identifier',
  authenticate,
  can(PERMISSIONS.DESIGN_UPDATE_OWN),
  validate(validator.update),
  controller.update,
);
router.delete(
  '/:identifier',
  authenticate,
  can(PERMISSIONS.DESIGN_DELETE_OWN),
  validate(validator.remove),
  controller.remove,
);

router.post(
  '/:identifier/versions',
  authenticate,
  can(PERMISSIONS.DESIGN_UPDATE_OWN),
  validate(validator.createVersion),
  controller.createVersion,
);
router.post(
  '/:identifier/publish',
  authenticate,
  requireVerifiedEmail,
  can(PERMISSIONS.DESIGN_PUBLISH),
  validate(validator.publish),
  controller.publish,
);

// ── Files ─────────────────────────────────────────────────────────────────
router.post(
  '/:identifier/files',
  authenticate,
  requireVerifiedEmail,
  can(PERMISSIONS.DESIGN_UPDATE_OWN),
  uploadLimiter,
  uploadDesignFiles.array('files', 20),
  validate(validator.addFiles),
  controller.addFiles,
);
router.delete(
  '/:identifier/files/:fileId',
  authenticate,
  can(PERMISSIONS.DESIGN_UPDATE_OWN),
  validate(validator.removeFile),
  controller.removeFile,
);

// ── Download gate (SCR-020) — login required, download is recorded ────────
router.get('/:identifier/download-info', optionalAuthenticate, validate(validator.remove), controller.downloadInfo);
router.get(
  '/:identifier/download',
  authenticate,
  can(PERMISSIONS.DESIGN_DOWNLOAD),
  validate(validator.download),
  controller.download,
);

// ── Engagement ────────────────────────────────────────────────────────────
router.post('/:identifier/star', authenticate, validate(validator.star), controller.toggleStar);
router.post('/:identifier/ownership', authenticate, validate(validator.ownership), controller.setOwnership);
router.get('/:identifier/ownership', optionalAuthenticate, validate(validator.star), controller.listOwnerships);

// ── Comments ──────────────────────────────────────────────────────────────
router.get('/:identifier/comments', optionalAuthenticate, validate(validator.listComments), controller.listComments);
router.post(
  '/:identifier/comments',
  authenticate,
  requireVerifiedEmail,
  can(PERMISSIONS.COMMENT_CREATE),
  writeLimiter,
  validate(validator.addComment),
  controller.addComment,
);
router.patch('/comments/:commentId', authenticate, validate(validator.updateComment), controller.updateComment);
router.delete('/comments/:commentId', authenticate, validate(validator.deleteComment), controller.deleteComment);

module.exports = router;
