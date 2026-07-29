/**
 * Auth HTTP layer. Controllers stay thin: shape the input, call the service,
 * shape the response. No SQL, no business rules.
 *
 * The refresh token is also set as an httpOnly cookie so a browser client can
 * rely on the cookie while native/API clients use the JSON field.
 */
const config = require('../../config');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const authService = require('./auth.service');

const REFRESH_COOKIE = 'refreshToken';

const cookieOptions = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: config.isProduction ? 'strict' : 'lax',
  path: '/',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const contextOf = (req) => ({ ip: req.ip, userAgent: req.headers['user-agent'], requestId: req.id });

function setRefreshCookie(res, tokens) {
  if (tokens?.refreshToken) res.cookie(REFRESH_COOKIE, tokens.refreshToken, cookieOptions);
}

const authController = {
  register: asyncHandler(async (req, res) => {
    const result = await authService.register(req.body, contextOf(req));
    setRefreshCookie(res, result.tokens);

    return ApiResponse.created(res, {
      data: result,
      message: result.requiresVerification
        ? 'Account created. Check your inbox to confirm your email address.'
        : 'Account created successfully',
    });
  }),

  login: asyncHandler(async (req, res) => {
    const result = await authService.login(req.body, contextOf(req));
    setRefreshCookie(res, result.tokens);
    return ApiResponse.success(res, { data: result, message: 'Signed in successfully' });
  }),

  refresh: asyncHandler(async (req, res) => {
    const token = req.body.refreshToken || req.cookies?.[REFRESH_COOKIE];
    const result = await authService.refresh(token, contextOf(req));
    setRefreshCookie(res, result.tokens);
    return ApiResponse.success(res, { data: result, message: 'Session refreshed' });
  }),

  logout: asyncHandler(async (req, res) => {
    const token = req.body.refreshToken || req.cookies?.[REFRESH_COOKIE];
    const result = await authService.logout(token, {
      allDevices: req.body.allDevices,
      userId: req.user?.id,
    });
    res.clearCookie(REFRESH_COOKIE, { ...cookieOptions, maxAge: undefined });
    return ApiResponse.success(res, { data: result, message: 'Signed out successfully' });
  }),

  verifyEmail: asyncHandler(async (req, res) => {
    const result = await authService.verifyEmail(req.body, contextOf(req));
    setRefreshCookie(res, result.tokens);
    return ApiResponse.success(res, { data: result, message: 'Email address confirmed' });
  }),

  resendVerification: asyncHandler(async (req, res) => {
    const result = await authService.resendVerification(req.body.email, contextOf(req));
    return ApiResponse.success(res, {
      data: result,
      message: 'If that address needs confirming, a new code is on its way',
    });
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    const result = await authService.forgotPassword(req.body.email, contextOf(req));
    return ApiResponse.success(res, {
      data: result,
      message: 'If an account exists for that address, a reset link has been sent',
    });
  }),

  resetPassword: asyncHandler(async (req, res) => {
    const result = await authService.resetPassword(req.body, contextOf(req));
    return ApiResponse.success(res, { data: result, message: 'Password updated. You can now sign in.' });
  }),

  changePassword: asyncHandler(async (req, res) => {
    const result = await authService.changePassword(req.user.id, req.body, contextOf(req));
    setRefreshCookie(res, result.tokens);
    return ApiResponse.success(res, { data: result, message: 'Password changed successfully' });
  }),

  me: asyncHandler(async (req, res) => {
    const user = await authService.me(req.user.id);
    return ApiResponse.success(res, { data: { user }, message: 'Current user' });
  }),

  sessions: asyncHandler(async (req, res) => {
    const sessions = await authService.listSessions(req.user.id);
    return ApiResponse.success(res, { data: sessions, message: 'Active sessions' });
  }),

  revokeSession: asyncHandler(async (req, res) => {
    const result = await authService.revokeSession(req.user.id, req.params.sessionId);
    return ApiResponse.success(res, { data: result, message: 'Session revoked' });
  }),
};

module.exports = authController;
