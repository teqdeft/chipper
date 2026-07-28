/**
 * /api/v1/notifications — SCR-031
 */
const express = require('express');
const Joi = require('joi');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const validate = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/authenticate');
const c = require('../../validators/common.validator');
const service = require('./notification.service');

const router = express.Router();
router.use(authenticate);

router.get(
  '/',
  validate({
    query: Joi.object({
      ...c.pagination,
      unreadOnly: Joi.boolean().default(false),
      type: Joi.string().trim().max(64),
    }),
  }),
  asyncHandler(async (req, res) => {
    const { items, pagination, unreadCount } = await service.list(req.user.id, req.query);
    return ApiResponse.paginated(res, { items, pagination, meta: { unreadCount }, message: 'Notifications' });
  }),
);

router.get(
  '/unread-count',
  asyncHandler(async (req, res) =>
    ApiResponse.success(res, {
      data: { unreadCount: await service.unreadCount(req.user.id) },
      message: 'Unread notifications',
    }),
  ),
);

router.patch(
  '/read-all',
  asyncHandler(async (req, res) =>
    ApiResponse.success(res, { data: await service.markAllRead(req.user.id), message: 'All marked as read' }),
  ),
);

router.patch(
  '/:id/read',
  validate({ params: c.idParam() }),
  asyncHandler(async (req, res) =>
    ApiResponse.success(res, { data: await service.markRead(req.user.id, req.params.id), message: 'Marked as read' }),
  ),
);

router.delete(
  '/clear',
  asyncHandler(async (req, res) =>
    ApiResponse.success(res, { data: await service.clear(req.user.id), message: 'Notifications cleared' }),
  ),
);

router.delete(
  '/:id',
  validate({ params: c.idParam() }),
  asyncHandler(async (req, res) =>
    ApiResponse.success(res, { data: await service.remove(req.user.id, req.params.id), message: 'Notification removed' }),
  ),
);

module.exports = router;
