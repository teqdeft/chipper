/**
 * /api/v1/users — SCR-014, SCR-015, SCR-016
 */
const express = require('express');
const controller = require('./user.controller');
const validator = require('./user.validator');
const validate = require('../../middlewares/validate');
const { authenticate, optionalAuthenticate } = require('../../middlewares/authenticate');
const { uploadAvatar } = require('../../middlewares/upload');
const { uploadLimiter, searchLimiter } = require('../../middlewares/rateLimiter');

const router = express.Router();

// ── Member directory — signed-in only ─────────────────────────────────────
// Browsing the membership is a members' benefit, not public data: an open
// endpoint here is a scrapeable list of every researcher and their affiliation.
// Individual profiles stay public at /users/:handle.
router.get('/', authenticate, searchLimiter, validate(validator.list), controller.list);
router.get('/mentions', authenticate, validate(validator.mentions), controller.mentions);

// ── Own account ───────────────────────────────────────────────────────────
router.get('/me', authenticate, controller.getMe);
router.patch('/me', authenticate, validate(validator.updateProfile), controller.updateMe);
router.post('/me/avatar', authenticate, uploadLimiter, uploadAvatar.single('avatar'), controller.uploadAvatar);
router.delete('/me/avatar', authenticate, controller.deleteAvatar);
router.get('/me/settings', authenticate, controller.getSettings);
router.patch('/me/settings', authenticate, validate(validator.updateSettings), controller.updateSettings);
router.delete('/me', authenticate, validate(validator.deleteAccount), controller.deleteAccount);

// ── Public profile — keep last so it does not shadow /me ──────────────────
router.get('/:handle', optionalAuthenticate, validate(validator.publicProfile), controller.getPublicProfile);

module.exports = router;
