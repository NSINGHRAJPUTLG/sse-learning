const asyncHandler = require('../../utils/asyncHandler');
const { sendResponse } = require('../../utils/response');
const authService = require('./auth.service');

const register = asyncHandler(async (req, res) => {
  const data = await authService.registerUser(req.body, req.user);
  return sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'User registered successfully',
    data,
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password, companyId } = req.body;
  const data = await authService.login(email, password, companyId, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  req.audit({
    companyId,
    userId: String(data.user._id),
    action: 'LOGIN',
    module: 'AUTH',
    entityId: String(data.user._id),
    entityType: 'AUTH',
    before: null,
    after: { role: data.user.role, email: data.user.email },
  });

  return sendResponse(res, {
    success: true,
    message: 'Login successful',
    data,
  });
});

const refresh = asyncHandler(async (req, res) => {
  const data = await authService.refreshToken(req.body.refreshToken);
  return sendResponse(res, {
    success: true,
    message: 'Token refreshed',
    data,
  });
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.userId, req.user.companyId);
  req.audit({
    action: 'LOGOUT',
    module: 'AUTH',
    entityId: req.user.userId,
    entityType: 'AUTH',
    before: { session: 'active' },
    after: { session: 'closed' },
  });
  return sendResponse(res, {
    success: true,
    message: 'Logout successful',
    data: {},
  });
});

const me = asyncHandler(async (req, res) => {
  const data = await authService.getMe(req.user.userId, req.user.companyId);
  return sendResponse(res, {
    success: true,
    message: 'Current user fetched',
    data,
  });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  me,
};
