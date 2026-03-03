const asyncHandler = require('../../utils/asyncHandler');
const { sendResponse } = require('../../utils/response');
const reportsService = require('./reports.service');

const employeeStats = asyncHandler(async (req, res) => {
  const data = await reportsService.getEmployeeStats(req.user, req.query);
  return sendResponse(res, { success: true, message: 'Employee statistics fetched', data });
});

const attendanceSummary = asyncHandler(async (req, res) => {
  const data = await reportsService.getAttendanceSummary(req.user, req.query.month, req.query.year);
  return sendResponse(res, { success: true, message: 'Attendance summary fetched', data });
});

const leaveSummary = asyncHandler(async (req, res) => {
  const data = await reportsService.getLeaveSummary(req.user, req.query.year);
  return sendResponse(res, { success: true, message: 'Leave summary fetched', data });
});

const payrollSummary = asyncHandler(async (req, res) => {
  const data = await reportsService.getPayrollSummary(req.user, req.query.year);
  return sendResponse(res, { success: true, message: 'Payroll summary fetched', data });
});

const attrition = asyncHandler(async (req, res) => {
  const data = await reportsService.getAttrition(req.user, req.query.year);
  return sendResponse(res, { success: true, message: 'Attrition fetched', data });
});

const dashboard = asyncHandler(async (req, res) => {
  const data = await reportsService.getDashboard(req.user, req.query);
  return sendResponse(res, { success: true, message: 'Dashboard metrics fetched', data });
});

module.exports = {
  employeeStats,
  attendanceSummary,
  leaveSummary,
  payrollSummary,
  attrition,
  dashboard,
};
