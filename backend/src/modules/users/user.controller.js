const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const auditService = require('../../services/audit.service');
const userService = require('./user.service');

module.exports = {
  getMe: asyncHandler(async (req, res) => {
    const user = await userService.getProfile(req.user.id);
    return ApiResponse.success(res, { data: { user }, message: 'Your profile' });
  }),

  updateMe: asyncHandler(async (req, res) => {
    const user = await userService.updateProfile(req.user.id, req.body, auditService.contextFrom(req));
    return ApiResponse.success(res, { data: { user }, message: 'Profile updated' });
  }),

  uploadAvatar: asyncHandler(async (req, res) => {
    const user = await userService.updateAvatar(req.user.id, req.file);
    return ApiResponse.success(res, { data: { user }, message: 'Profile picture updated' });
  }),

  deleteAvatar: asyncHandler(async (req, res) => {
    const user = await userService.removeAvatar(req.user.id);
    return ApiResponse.success(res, { data: { user }, message: 'Profile picture removed' });
  }),

  getSettings: asyncHandler(async (req, res) => {
    const settings = await userService.getSettings(req.user.id);
    return ApiResponse.success(res, { data: { settings }, message: 'Account settings' });
  }),

  updateSettings: asyncHandler(async (req, res) => {
    const settings = await userService.updateSettings(req.user.id, req.body);
    return ApiResponse.success(res, { data: { settings }, message: 'Settings saved' });
  }),

  deleteAccount: asyncHandler(async (req, res) => {
    const result = await userService.deleteAccount(req.user.id, req.body, auditService.contextFrom(req));
    res.clearCookie('refreshToken', { path: '/' });
    return ApiResponse.success(res, { data: result, message: 'Your account has been removed' });
  }),

  getPublicProfile: asyncHandler(async (req, res) => {
    const profile = await userService.getPublicProfile(req.params.handle, req.user);
    return ApiResponse.success(res, { data: { user: profile }, message: 'Member profile' });
  }),

  list: asyncHandler(async (req, res) => {
    const { items, pagination } = await userService.search(req.query);
    return ApiResponse.paginated(res, { items, pagination, message: 'Members' });
  }),

  mentions: asyncHandler(async (req, res) => {
    const items = await userService.mentionSuggestions(req.query.q, req.query.limit);
    return ApiResponse.success(res, { data: items, message: 'Mention suggestions' });
  }),
};
