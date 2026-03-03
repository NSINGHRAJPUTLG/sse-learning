const asyncHandler = require('../../utils/asyncHandler');
const { sendResponse } = require('../../utils/response');
const service = require('./service');

const summary = asyncHandler(async (req, res) => {
  const data = await service.getSummary(req.user.companyId, req.query);
  return sendResponse(res, { data, message: 'Dashboard summary fetched' });
});

module.exports = { summary };
