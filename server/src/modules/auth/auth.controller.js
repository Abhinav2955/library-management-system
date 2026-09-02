const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const authService = require('./auth.service');
const env = require('../../config/env');

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/v1/auth/refresh',
};

const requestMeta = (req) => ({
  userAgent: req.headers['user-agent'],
  ipAddress: req.ip,
});

const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  return new ApiResponse(201, user.toSafeJSON(), 'Account created successfully').send(res);
});

const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body, requestMeta(req));

  res.cookie(env.REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  return new ApiResponse(200, { user: user.toSafeJSON(), accessToken }, 'Login successful').send(res);
});

const refresh = asyncHandler(async (req, res) => {
  const rawToken = req.cookies?.[env.REFRESH_COOKIE_NAME];
  const { user, accessToken, refreshToken } = await authService.refresh(rawToken, requestMeta(req));

  res.cookie(env.REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  return new ApiResponse(200, { user: user.toSafeJSON(), accessToken }, 'Token refreshed').send(res);
});

const logout = asyncHandler(async (req, res) => {
  const rawToken = req.cookies?.[env.REFRESH_COOKIE_NAME];
  await authService.logout(rawToken);
  res.clearCookie(env.REFRESH_COOKIE_NAME, { path: '/api/v1/auth/refresh' });
  return new ApiResponse(200, null, 'Logged out successfully').send(res);
});

const me = asyncHandler(async (req, res) => {
  return new ApiResponse(200, req.user.toSafeJSON()).send(res);
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user.id, currentPassword, newPassword);
  return new ApiResponse(200, null, 'Password changed. Please log in again.').send(res);
});

const verifyEmail = asyncHandler(async (req, res) => {
  await authService.verifyEmail(req.body.token);
  return new ApiResponse(200, null, 'Email verified successfully').send(res);
});

const resendVerification = asyncHandler(async (req, res) => {
  await authService.resendVerificationEmail(req.user.id);
  return new ApiResponse(200, null, 'Verification email sent').send(res);
});

const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  return new ApiResponse(200, null, 'If that email is registered, a reset link has been sent').send(res);
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  return new ApiResponse(200, null, 'Password reset successfully. Please log in.').send(res);
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  me,
  changePassword,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
};