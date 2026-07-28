/**
 * /api/v1/forum — SCR-024..028
 * Guests read; members post (CHIP-039..047).
 */
const express = require('express');
const controller = require('./forum.controller');
const validator = require('./forum.validator');
const validate = require('../../middlewares/validate');
const { authenticate, optionalAuthenticate, requireVerifiedEmail } = require('../../middlewares/authenticate');
const { can } = require('../../middlewares/authorize');
const { writeLimiter, searchLimiter } = require('../../middlewares/rateLimiter');
const { PERMISSIONS } = require('../../config/permissions');

const router = express.Router();

// ── Reads ─────────────────────────────────────────────────────────────────
router.get('/', optionalAuthenticate, controller.home);
router.get('/topics', optionalAuthenticate, validate(validator.listTopics), controller.listTopics);
router.get('/search', optionalAuthenticate, searchLimiter, validate(validator.search), controller.search);
router.get(
  '/categories/:category/topics',
  optionalAuthenticate,
  validate(validator.categoryTopics),
  controller.categoryTopics,
);

// ── Writes ────────────────────────────────────────────────────────────────
router.post(
  '/topics',
  authenticate,
  requireVerifiedEmail,
  can(PERMISSIONS.FORUM_POST),
  writeLimiter,
  validate(validator.createTopic),
  controller.createTopic,
);

router.post('/posts/:postId/vote', authenticate, can(PERMISSIONS.FORUM_VOTE), validate(validator.vote), controller.vote);
router.patch('/posts/:postId', authenticate, validate(validator.updatePost), controller.updatePost);
router.delete('/posts/:postId', authenticate, validate(validator.deletePost), controller.deletePost);

// ── Single topic — declared last so /topics/:identifier does not shadow the
//    static routes above. ─────────────────────────────────────────────────
router.get('/topics/:identifier', optionalAuthenticate, validate(validator.getTopic), controller.getTopic);
router.patch('/topics/:identifier', authenticate, validate(validator.updateTopic), controller.updateTopic);
router.delete('/topics/:identifier', authenticate, validate(validator.deleteTopic), controller.deleteTopic);

router.post(
  '/topics/:identifier/posts',
  authenticate,
  requireVerifiedEmail,
  can(PERMISSIONS.FORUM_POST),
  writeLimiter,
  validate(validator.createPost),
  controller.createPost,
);
router.post(
  '/topics/:identifier/accept/:postId',
  authenticate,
  validate(validator.acceptAnswer),
  controller.acceptAnswer,
);
router.post(
  '/topics/:identifier/subscribe',
  authenticate,
  validate(validator.subscribe),
  controller.toggleSubscription,
);
router.patch(
  '/topics/:identifier/moderate',
  authenticate,
  can(PERMISSIONS.FORUM_MODERATE),
  validate(validator.moderateTopic),
  controller.moderateTopic,
);

module.exports = router;
