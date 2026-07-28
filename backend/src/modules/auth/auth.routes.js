/**
 * /api/v1/auth — SCR-009..013, SCR-015
 */
const express = require('express');
const controller = require('./auth.controller');
const validator = require('./auth.validator');
const validate = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/authenticate');
const { authLimiter, emailLimiter } = require('../../middlewares/rateLimiter');

const router = express.Router();

// ── Public ────────────────────────────────────────────────────────────────
router.post('/register', authLimiter, validate(validator.register), controller.register);
router.post('/login', authLimiter, validate(validator.login), controller.login);
router.post('/refresh', validate(validator.refresh), controller.refresh);
router.post('/logout', validate(validator.logout), controller.logout);

router.post('/verify-email', authLimiter, validate(validator.verifyEmail), controller.verifyEmail);
router.post('/resend-verification', emailLimiter, validate(validator.resendVerification), controller.resendVerification);
router.post('/forgot-password', emailLimiter, validate(validator.forgotPassword), controller.forgotPassword);
router.post('/reset-password', authLimiter, validate(validator.resetPassword), controller.resetPassword);

// ── Authenticated ─────────────────────────────────────────────────────────
router.use(authenticate);
router.get('/me', controller.me);
router.post('/change-password', validate(validator.changePassword), controller.changePassword);
router.get('/sessions', controller.sessions);
router.delete('/sessions/:sessionId', validate(validator.revokeSession), controller.revokeSession);

module.exports = router;
