const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const auditService = require('../../services/audit.service');
const service = require('./forum.service');

module.exports = {
  /** SCR-024 */
  home: asyncHandler(async (req, res) =>
    ApiResponse.success(res, { data: await service.home(), message: 'Forum home' }),
  ),

  /** SCR-025 / SCR-028 */
  listTopics: asyncHandler(async (req, res) => {
    const { items, pagination, category, viewerCanPost } = await service.listTopics(req.query, req.user);
    return ApiResponse.paginated(res, {
      items,
      pagination,
      meta: { category, viewerCanPost },
      message: 'Topics',
    });
  }),

  categoryTopics: asyncHandler(async (req, res) => {
    const { items, pagination, category, viewerCanPost } = await service.listTopics(
      { ...req.query, category: req.params.category },
      req.user,
    );
    return ApiResponse.paginated(res, {
      items,
      pagination,
      meta: { category, viewerCanPost },
      message: 'Category topics',
    });
  }),

  search: asyncHandler(async (req, res) => {
    const { items, pagination } = await service.search(req.query, req.user);
    return ApiResponse.paginated(res, { items, pagination, message: 'Search results' });
  }),

  /** SCR-026 */
  getTopic: asyncHandler(async (req, res) => {
    const data = await service.getTopic(req.params.identifier, req.query, req.user);
    return ApiResponse.success(res, { data, message: 'Topic' });
  }),

  /** SCR-027 */
  createTopic: asyncHandler(async (req, res) => {
    const topic = await service.createTopic(req.body, req.user, auditService.contextFrom(req));
    return ApiResponse.created(res, { data: { topic }, message: 'Topic created' });
  }),

  updateTopic: asyncHandler(async (req, res) => {
    const topic = await service.updateTopic(req.params.identifier, req.body, req.user);
    return ApiResponse.success(res, { data: { topic }, message: 'Topic updated' });
  }),

  deleteTopic: asyncHandler(async (req, res) => {
    const result = await service.deleteTopic(req.params.identifier, req.user, auditService.contextFrom(req));
    return ApiResponse.success(res, { data: result, message: 'Topic removed' });
  }),

  createPost: asyncHandler(async (req, res) => {
    const post = await service.createPost(req.params.identifier, req.body, req.user);
    return ApiResponse.created(res, { data: { post }, message: 'Reply posted' });
  }),

  updatePost: asyncHandler(async (req, res) => {
    const post = await service.updatePost(req.params.postId, req.body, req.user);
    return ApiResponse.success(res, { data: { post }, message: 'Reply updated' });
  }),

  deletePost: asyncHandler(async (req, res) => {
    const result = await service.deletePost(req.params.postId, req.user);
    return ApiResponse.success(res, { data: result, message: 'Reply removed' });
  }),

  vote: asyncHandler(async (req, res) => {
    const result = await service.vote(req.params.postId, req.body.value, req.user);
    return ApiResponse.success(res, { data: result, message: 'Vote recorded' });
  }),

  acceptAnswer: asyncHandler(async (req, res) => {
    const result = await service.acceptAnswer(req.params.identifier, req.params.postId, req.user);
    return ApiResponse.success(res, {
      data: result,
      message: result.accepted ? 'Answer accepted' : 'Accepted answer cleared',
    });
  }),

  toggleSubscription: asyncHandler(async (req, res) => {
    const result = await service.toggleSubscription(req.params.identifier, req.user);
    return ApiResponse.success(res, {
      data: result,
      message: result.subscribed ? 'Subscribed to this thread' : 'Unsubscribed',
    });
  }),

  moderateTopic: asyncHandler(async (req, res) => {
    const topic = await service.moderateTopic(
      req.params.identifier,
      req.body,
      req.user,
      auditService.contextFrom(req),
    );
    return ApiResponse.success(res, { data: { topic }, message: 'Topic updated' });
  }),
};
