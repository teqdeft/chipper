/**
 * /api/v1/reports — members flag content (CHIP-052).
 * The moderator-facing queue lives under /api/v1/admin/moderation.
 */
const express = require('express');
const Joi = require('joi');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const validate = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/authenticate');
const { can } = require('../../middlewares/authorize');
const { writeLimiter } = require('../../middlewares/rateLimiter');
const { PERMISSIONS } = require('../../config/permissions');
const { ENTITY_TYPE } = require('../../config/constants');
const c = require('../../validators/common.validator');
const service = require('./moderation.service');

const router = express.Router();

router.post(
  '/',
  authenticate,
  can(PERMISSIONS.REPORT_CREATE),
  writeLimiter,
  validate({
    body: Joi.object({
      entityType: Joi.string().valid(...Object.values(ENTITY_TYPE)).required(),
      entityId: c.id.required(),
      reason: Joi.string().valid('spam', 'abuse', 'licence', 'off-topic', 'inaccurate', 'other').required(),
      details: Joi.string().trim().max(2000).allow('', null),
    }),
  }),
  asyncHandler(async (req, res) => {
    const result = await service.createReport(req.body, req.user);
    return ApiResponse.created(res, { data: result, message: result.message });
  }),
);

module.exports = router;
