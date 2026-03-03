const asyncHandler = require('../../utils/asyncHandler');
const { sendResponse } = require('../../utils/response');
const attendanceService = require('./attendance.service');

const checkIn = asyncHandler(async (req, res) => {
  const data = await attendanceService.checkIn(req.user, {
    ipAddress: req.ip,
    location: req.body.location,
  });
  req.audit({
    action: 'CHECK_IN',
    module: 'ATTENDANCE',
    entityId: data._id,
    entityType: 'ATTENDANCE',
    before: null,
    after: data,
  });

  return sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Check-in successful',
    data,
  });
});

const checkOut = asyncHandler(async (req, res) => {
  const data = await attendanceService.checkOut(req.user, {
    location: req.body.location,
  });
  req.audit({
    action: 'CHECK_OUT',
    module: 'ATTENDANCE',
    entityId: data._id,
    entityType: 'ATTENDANCE',
    before: null,
    after: data,
  });

  return sendResponse(res, {
    success: true,
    message: 'Check-out successful',
    data,
  });
});

const list = asyncHandler(async (req, res) => {
  const data = await attendanceService.getAttendanceList(req.query, req.user);
  return sendResponse(res, {
    success: true,
    message: 'Attendance list fetched successfully',
    data,
  });
});

const summary = asyncHandler(async (req, res) => {
  const data = await attendanceService.getAttendanceSummary(req.user, req.query);
  return sendResponse(res, {
    success: true,
    message: 'Attendance summary fetched successfully',
    data,
  });
});

module.exports = {
  checkIn,
  checkOut,
  list,
  summary,
};
