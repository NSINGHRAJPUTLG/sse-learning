const asyncHandler = require('../../utils/asyncHandler');
const { sendResponse } = require('../../utils/response');
const auditService = require('./audit.service');

const getAuditLogs = asyncHandler(async (req, res) => {
  const data = await auditService.getAuditLogs(req.user, req.query);
  return sendResponse(res, { success: true, message: 'Audit logs fetched', data });
});

const getMyActivity = asyncHandler(async (req, res) => {
  const data = await auditService.getMyActivity(req.user, req.query);
  return sendResponse(res, { success: true, message: 'My activity fetched', data });
});

module.exports = {
  getAuditLogs,
  getMyActivity,
};
