/**
 * /api/v1/content — public marketing + editorial reads (SCR-001..008).
 * Admin write operations live under /api/v1/admin/content.
 */
const express = require('express');
const Joi = require('joi');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const validate = require('../../middlewares/validate');
const c = require('../../validators/common.validator');
const service = require('./content.service');

const router = express.Router();

/** SCR-001 — home: featured + latest designs, news teaser, stats. */
router.get(
  '/home',
  asyncHandler(async (req, res) =>
    ApiResponse.success(res, { data: await service.homeSummary(), message: 'Home' }),
  ),
);

router.get(
  '/settings',
  asyncHandler(async (req, res) =>
    ApiResponse.success(res, { data: await service.publicSettings(), message: 'Public settings' }),
  ),
);

router.get(
  '/stats',
  asyncHandler(async (req, res) =>
    ApiResponse.success(res, { data: await service.communityStats(), message: 'Community stats' }),
  ),
);

/** SCR-004 */
router.get(
  '/news',
  validate({
    query: Joi.object({ ...c.pagination, category: Joi.string().trim().max(64), search: c.search }),
  }),
  asyncHandler(async (req, res) => {
    const { items, pagination } = await service.listNews(req.query);
    return ApiResponse.paginated(res, { items, pagination, message: 'News' });
  }),
);

/** SCR-005 */
router.get(
  '/news/:slug',
  validate({ params: Joi.object({ slug: Joi.string().trim().max(200).required() }) }),
  asyncHandler(async (req, res) =>
    ApiResponse.success(res, { data: await service.getNews(req.params.slug), message: 'Article' }),
  ),
);

/** SCR-002, SCR-003, SCR-006, SCR-007, SCR-008 */
router.get(
  '/pages',
  asyncHandler(async (req, res) =>
    ApiResponse.success(res, { data: await service.listPages(), message: 'Pages' }),
  ),
);

router.get(
  '/pages/:slug',
  validate({ params: Joi.object({ slug: c.slug.required() }) }),
  asyncHandler(async (req, res) =>
    ApiResponse.success(res, { data: { page: await service.getPage(req.params.slug) }, message: 'Page' }),
  ),
);

module.exports = router;
