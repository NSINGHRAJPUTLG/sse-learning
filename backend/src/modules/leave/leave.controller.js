const asyncHandler = require('../../utils/asyncHandler');
const { sendResponse } = require('../../utils/response');
const leaveService = require('./leave.service');
const { Leave } = require('./leave.model');

const createLeaveType = asyncHandler(async (req, res) => {
  const data = await leaveService.createLeaveType(req.user, req.body);
  return sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Leave type created successfully',
    data,
  });
});

const listLeaveTypes = asyncHandler(async (req, res) => {
  const data = await leaveService.listLeaveTypes(req.user);
  return sendResponse(res, { success: true, message: 'Leave types fetched successfully', data });
});

const applyLeave = asyncHandler(async (req, res) => {
  const data = await leaveService.applyLeave(req.user, req.body);
  req.audit({
    action: 'CREATE',
    module: 'LEAVE',
    entityId: data._id,
    entityType: 'LEAVE',
    before: null,
    after: data,
  });
  return sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Leave applied successfully',
    data,
  });
});

const approveLeave = asyncHandler(async (req, res) => {
  const before = await Leave.findOne({ _id: req.params.id, companyId: req.user.companyId }).lean();
  const data = await leaveService.approveLeave(req.params.id, req.user);
  req.audit({
    action: 'APPROVE',
    module: 'LEAVE',
    entityId: req.params.id,
    entityType: 'LEAVE',
    before,
    after: data,
  });
  return sendResponse(res, { success: true, message: 'Leave approval processed', data });
});

const rejectLeave = asyncHandler(async (req, res) => {
  const before = await Leave.findOne({ _id: req.params.id, companyId: req.user.companyId }).lean();
  const data = await leaveService.rejectLeave(req.params.id, req.user);
  req.audit({
    action: 'REJECT',
    module: 'LEAVE',
    entityId: req.params.id,
    entityType: 'LEAVE',
    before,
    after: data,
  });
  return sendResponse(res, { success: true, message: 'Leave rejected', data });
});

const cancelLeave = asyncHandler(async (req, res) => {
  const before = await Leave.findOne({ _id: req.params.id, companyId: req.user.companyId }).lean();
  const data = await leaveService.cancelLeave(req.params.id, req.user);
  req.audit({
    action: 'CANCEL',
    module: 'LEAVE',
    entityId: req.params.id,
    entityType: 'LEAVE',
    before,
    after: data,
  });
  return sendResponse(res, { success: true, message: 'Leave cancelled', data });
});

const getLeaveList = asyncHandler(async (req, res) => {
  const data = await leaveService.getLeaveList(req.query, req.user);
  return sendResponse(res, { success: true, message: 'Leaves fetched successfully', data });
});

const getLeaveSummary = asyncHandler(async (req, res) => {
  const data = await leaveService.getLeaveSummary(req.user, req.query.employeeId, req.query.year);
  return sendResponse(res, { success: true, message: 'Leave summary fetched successfully', data });
});

const getLeaveCalendar = asyncHandler(async (req, res) => {
  const data = await leaveService.getLeaveCalendar(req.user, req.query.month, req.query.year);
  return sendResponse(res, { success: true, message: 'Leave calendar fetched successfully', data });
});

module.exports = {
  createLeaveType,
  listLeaveTypes,
  applyLeave,
  approveLeave,
  rejectLeave,
  cancelLeave,
  getLeaveList,
  getLeaveSummary,
  getLeaveCalendar,
};
