/**
 * /api/v1/messages — SCR-029, SCR-030
 */
const express = require('express');
const Joi = require('joi');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const validate = require('../../middlewares/validate');
const { authenticate, requireVerifiedEmail } = require('../../middlewares/authenticate');
const { can } = require('../../middlewares/authorize');
const { uploadAttachments } = require('../../middlewares/upload');
const { writeLimiter, uploadLimiter } = require('../../middlewares/rateLimiter');
const { PERMISSIONS } = require('../../config/permissions');
const c = require('../../validators/common.validator');
const service = require('./message.service');

const router = express.Router();
router.use(authenticate);

const identifier = Joi.alternatives().try(c.id, c.uuid).required();

/** SCR-029 — inbox */
router.get(
  '/',
  validate({ query: Joi.object({ ...c.pagination, archived: Joi.boolean().default(false) }) }),
  asyncHandler(async (req, res) => {
    const { items, pagination, totalUnread } = await service.listConversations(req.user.id, req.query);
    return ApiResponse.paginated(res, { items, pagination, meta: { totalUnread }, message: 'Conversations' });
  }),
);

router.get(
  '/unread-count',
  asyncHandler(async (req, res) =>
    ApiResponse.success(res, {
      data: { unreadCount: await service.unreadCount(req.user.id) },
      message: 'Unread messages',
    }),
  ),
);

/** Start a conversation (or append to the existing 1:1 thread). */
router.post(
  '/',
  requireVerifiedEmail,
  can(PERMISSIONS.MESSAGE_SEND),
  writeLimiter,
  uploadAttachments.array('attachments', 5),
  validate({
    body: Joi.object({
      recipientHandle: c.handle,
      recipientId: c.id,
      subject: Joi.string().trim().max(200).allow('', null),
      body: Joi.string().trim().min(1).max(20000).required(),
    }).or('recipientHandle', 'recipientId'),
  }),
  asyncHandler(async (req, res) => {
    const result = await service.startConversation(req.body, req.user, req.files || []);
    return ApiResponse.created(res, { data: result, message: 'Message sent' });
  }),
);

/** SCR-030 — a thread */
router.get(
  '/:identifier',
  validate({ params: Joi.object({ identifier }), query: Joi.object({ ...c.pagination }) }),
  asyncHandler(async (req, res) => {
    const data = await service.getConversation(req.params.identifier, req.user.id, req.query);
    return ApiResponse.success(res, { data, message: 'Conversation' });
  }),
);

router.post(
  '/:identifier/messages',
  requireVerifiedEmail,
  can(PERMISSIONS.MESSAGE_SEND),
  writeLimiter,
  uploadLimiter,
  uploadAttachments.array('attachments', 5),
  validate({
    params: Joi.object({ identifier }),
    body: Joi.object({ body: Joi.string().trim().min(1).max(20000).required() }),
  }),
  asyncHandler(async (req, res) => {
    const result = await service.sendMessage(req.params.identifier, req.body, req.user, req.files || []);
    return ApiResponse.created(res, { data: result, message: 'Message sent' });
  }),
);

router.patch(
  '/:identifier/read',
  validate({ params: Joi.object({ identifier }) }),
  asyncHandler(async (req, res) => {
    const { conversation } = await service.getConversation(req.params.identifier, req.user.id, { limit: 1 });
    return ApiResponse.success(res, {
      data: await service.markRead(conversation.numericId, req.user.id),
      message: 'Marked as read',
    });
  }),
);

router.patch(
  '/:identifier/archive',
  validate({
    params: Joi.object({ identifier }),
    body: Joi.object({ archived: Joi.boolean().default(true) }),
  }),
  asyncHandler(async (req, res) =>
    ApiResponse.success(res, {
      data: await service.setArchived(req.params.identifier, req.user.id, req.body.archived),
      message: req.body.archived ? 'Conversation archived' : 'Conversation restored',
    }),
  ),
);

router.patch(
  '/:identifier/mute',
  validate({
    params: Joi.object({ identifier }),
    body: Joi.object({ muted: Joi.boolean().default(true) }),
  }),
  asyncHandler(async (req, res) =>
    ApiResponse.success(res, {
      data: await service.setMuted(req.params.identifier, req.user.id, req.body.muted),
      message: req.body.muted ? 'Conversation muted' : 'Conversation unmuted',
    }),
  ),
);

router.delete(
  '/:identifier',
  validate({ params: Joi.object({ identifier }) }),
  asyncHandler(async (req, res) =>
    ApiResponse.success(res, {
      data: await service.leave(req.params.identifier, req.user.id),
      message: 'You left the conversation',
    }),
  ),
);

router.delete(
  '/items/:messageId',
  validate({ params: Joi.object({ messageId: c.id.required() }) }),
  asyncHandler(async (req, res) =>
    ApiResponse.success(res, {
      data: await service.deleteMessage(req.params.messageId, req.user),
      message: 'Message removed',
    }),
  ),
);

module.exports = router;
