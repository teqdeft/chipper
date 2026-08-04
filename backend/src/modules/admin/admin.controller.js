const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const auditService = require('../../services/audit.service');
const adminService = require('./admin.service');
const moderationService = require('../moderation/moderation.service');
const contentService = require('../content/content.service');
const forumRepository = require('../forum/forum.repository');

const ctx = (req) => auditService.contextFrom(req);

module.exports = {
  /** SCR-032 */
  dashboard: asyncHandler(async (req, res) =>
    ApiResponse.success(res, { data: await adminService.dashboard(), message: 'Dashboard' }),
  ),

  // ── Users (SCR-033) ──────────────────────────────────────────────────────
  listUsers: asyncHandler(async (req, res) => {
    const { items, pagination } = await adminService.listUsers(req.query);
    return ApiResponse.paginated(res, { items, pagination, message: 'Users' });
  }),

  getUser: asyncHandler(async (req, res) =>
    ApiResponse.success(res, { data: { user: await adminService.getUser(req.params.id) }, message: 'User' }),
  ),

  changeRole: asyncHandler(async (req, res) => {
    const user = await adminService.changeRole(req.params.id, req.body.role, req.user, ctx(req));
    return ApiResponse.success(res, { data: { user }, message: 'Role updated' });
  }),

  changeStatus: asyncHandler(async (req, res) => {
    const user = await adminService.changeStatus(req.params.id, req.body, req.user, ctx(req));
    return ApiResponse.success(res, { data: { user }, message: `Account ${req.body.status}` });
  }),

  awardBadge: asyncHandler(async (req, res) => {
    const user = await adminService.awardBadge(req.params.id, req.body.badge, req.user);
    return ApiResponse.success(res, { data: { user }, message: 'Badge awarded' });
  }),

  // ── Designs (SCR-034) ────────────────────────────────────────────────────
  listDesigns: asyncHandler(async (req, res) => {
    const { items, pagination } = await adminService.listDesigns(req.query);
    return ApiResponse.paginated(res, { items, pagination, message: 'Designs' });
  }),

  reviewDesign: asyncHandler(async (req, res) => {
    const result = await adminService.reviewDesign(req.params.identifier, req.body, req.user, ctx(req));
    return ApiResponse.success(res, { data: result, message: `Design ${result.status}` });
  }),

  deleteDesign: asyncHandler(async (req, res) => {
    const result = await adminService.deleteDesign(req.params.identifier, req.body, req.user, ctx(req));
    return ApiResponse.success(res, {
      data: result,
      message: `"${result.title}" was permanently deleted`,
    });
  }),

  featureDesign: asyncHandler(async (req, res) => {
    const result = await adminService.setDesignFeatured(
      req.params.identifier,
      req.body.featured,
      req.user,
      ctx(req),
    );
    return ApiResponse.success(res, {
      data: result,
      message: result.featured ? 'Design featured' : 'Design unfeatured',
    });
  }),

  // ── Moderation (SCR-035, SCR-036) ────────────────────────────────────────
  moderationQueue: asyncHandler(async (req, res) => {
    const [{ items, pagination }, summary] = await Promise.all([
      moderationService.listReports(req.query),
      moderationService.queueSummary(),
    ]);
    return ApiResponse.paginated(res, { items, pagination, meta: { summary }, message: 'Moderation queue' });
  }),

  claimReport: asyncHandler(async (req, res) =>
    ApiResponse.success(res, {
      data: await moderationService.claimReport(req.params.id, req.user),
      message: 'Report claimed',
    }),
  ),

  resolveReport: asyncHandler(async (req, res) => {
    const result = await moderationService.resolveReport(req.params.id, req.body, req.user, ctx(req));
    return ApiResponse.success(res, { data: result, message: 'Report resolved' });
  }),

  moderateEntity: asyncHandler(async (req, res) => {
    const result = await moderationService.moderateEntity(req.body, req.user, ctx(req));
    return ApiResponse.success(res, { data: result, message: 'Content moderated' });
  }),

  listComments: asyncHandler(async (req, res) => {
    const { items, pagination } = await moderationService.listAllComments(req.query);
    return ApiResponse.paginated(res, { items, pagination, message: 'Comments' });
  }),

  // ── News & pages (SCR-037) ───────────────────────────────────────────────
  listNews: asyncHandler(async (req, res) => {
    const { items, pagination } = await contentService.listNews(req.query, { includeDrafts: true });
    return ApiResponse.paginated(res, { items, pagination, message: 'News' });
  }),

  getNews: asyncHandler(async (req, res) => {
    const { article } = await contentService.getNews(req.params.slug, {
      includeDrafts: true,
      countView: false,
    });
    return ApiResponse.success(res, { data: { article }, message: 'Article' });
  }),

  createNews: asyncHandler(async (req, res) => {
    const article = await contentService.createNews(req.body, req.user, req.file);
    return ApiResponse.created(res, { data: { article }, message: 'Article created' });
  }),

  updateNews: asyncHandler(async (req, res) => {
    const article = await contentService.updateNews(req.params.slug, req.body, req.user, req.file);
    return ApiResponse.success(res, { data: { article }, message: 'Article updated' });
  }),

  deleteNews: asyncHandler(async (req, res) =>
    ApiResponse.success(res, {
      data: await contentService.deleteNews(req.params.slug),
      message: 'Article removed',
    }),
  ),

  listPages: asyncHandler(async (req, res) =>
    ApiResponse.success(res, {
      data: await contentService.listPages({ includeDrafts: true }),
      message: 'Pages',
    }),
  ),

  upsertPage: asyncHandler(async (req, res) => {
    const page = await contentService.upsertPage(req.params.slug, req.body, req.user);
    return ApiResponse.success(res, { data: { page }, message: 'Page saved' });
  }),

  deletePage: asyncHandler(async (req, res) =>
    ApiResponse.success(res, { data: await contentService.deletePage(req.params.slug), message: 'Page removed' }),
  ),

  // ── Forum management (SCR-038) ───────────────────────────────────────────
  listCategories: asyncHandler(async (req, res) =>
    ApiResponse.success(res, { data: await forumRepository.listCategories(), message: 'Categories' }),
  ),

  createCategory: asyncHandler(async (req, res) =>
    ApiResponse.created(res, {
      data: { category: await adminService.createCategory(req.body) },
      message: 'Category created',
    }),
  ),

  updateCategory: asyncHandler(async (req, res) =>
    ApiResponse.success(res, {
      data: { category: await adminService.updateCategory(req.params.category, req.body) },
      message: 'Category updated',
    }),
  ),

  deleteCategory: asyncHandler(async (req, res) =>
    ApiResponse.success(res, {
      data: await adminService.deleteCategory(req.params.category),
      message: 'Category removed',
    }),
  ),

  // ── Taxonomies & settings ────────────────────────────────────────────────
  upsertTaxonomy: asyncHandler(async (req, res) =>
    ApiResponse.success(res, {
      data: { item: await adminService.upsertTaxonomyItem(req.params.table, req.body) },
      message: 'Taxonomy item saved',
    }),
  ),

  deleteTaxonomy: asyncHandler(async (req, res) =>
    ApiResponse.success(res, {
      data: await adminService.deactivateTaxonomyItem(req.params.table, req.params.identifier),
      message: 'Taxonomy item deactivated',
    }),
  ),

  listSettings: asyncHandler(async (req, res) =>
    ApiResponse.success(res, { data: await contentService.allSettings(), message: 'Settings' }),
  ),

  updateSetting: asyncHandler(async (req, res) =>
    ApiResponse.success(res, {
      data: await contentService.updateSetting(req.params.key, req.body.value, req.user),
      message: 'Setting saved',
    }),
  ),

  auditLogs: asyncHandler(async (req, res) => {
    const { items, pagination } = await adminService.listAuditLogs(req.query);
    return ApiResponse.paginated(res, { items, pagination, message: 'Audit log' });
  }),
};
