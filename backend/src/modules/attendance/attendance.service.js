const ApiError = require('../../utils/ApiError');
const env = require('../../config/env');
const { Attendance } = require('./attendance.model');
const { Employee } = require('../employee/employee.model');
const payrollService = require('../payroll/payroll.service');
const { getPagination, getSort } = require('../../utils/pagination');
const { emitEvent } = require('../notifications/notification.events');

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function roundHours(num) {
  return Math.round(num * 100) / 100;
}

function calculateStatus(checkIn, totalHours) {
  const lateThreshold = new Date(checkIn);
  lateThreshold.setHours(env.attendanceLateHour, env.attendanceLateMinute, 0, 0);

  const isLate = checkIn.getTime() > lateThreshold.getTime();

  if (isLate) return 'LATE';
  if (totalHours < env.attendanceHalfDayHours) return 'ABSENT';
  if (totalHours < env.attendanceFullDayHours) return 'HALF_DAY';
  return 'PRESENT';
}

async function getEmployeeFromUser(user, options = {}) {
  const employee = await Employee.findOne({
    companyId: user.companyId,
    userId: user.userId,
  })
    .select('_id companyId userId status reportingManagerId')
    .session(options.session || null)
    .lean();

  if (!employee) throw new ApiError(404, 'Employee profile not found');
  return employee;
}

async function getManagerTeamIds(user) {
  const managerEmployee = await getEmployeeFromUser(user);
  const team = await Employee.find({
    companyId: user.companyId,
    reportingManagerId: managerEmployee._id,
  })
    .select('_id')
    .lean();

  return team.map((x) => x._id);
}

async function getScopedEmployeeFilter(user, requestedEmployeeId) {
  if (['SUPER_ADMIN', 'HR_ADMIN'].includes(user.role)) {
    return requestedEmployeeId ? { employeeId: requestedEmployeeId } : {};
  }

  if (user.role === 'EMPLOYEE') {
    const self = await getEmployeeFromUser(user);
    if (requestedEmployeeId && String(requestedEmployeeId) !== String(self._id)) {
      throw new ApiError(403, 'Employees can only access their own attendance');
    }
    return { employeeId: self._id };
  }

  if (user.role === 'MANAGER') {
    const teamIds = await getManagerTeamIds(user);
    if (requestedEmployeeId && !teamIds.some((id) => String(id) === String(requestedEmployeeId))) {
      throw new ApiError(403, 'Managers can only access team attendance');
    }
    return requestedEmployeeId
      ? { employeeId: requestedEmployeeId }
      : { employeeId: { $in: teamIds } };
  }

  throw new ApiError(403, 'Role not allowed');
}

async function checkIn(user, context = {}) {
  if (user.role !== 'EMPLOYEE') {
    throw new ApiError(403, 'Only EMPLOYEE can check in');
  }

  const employee = await getEmployeeFromUser(user);
  if (employee.status !== 'ACTIVE') throw new ApiError(403, 'Only ACTIVE employees can check in');

  const date = startOfDay(new Date());
  const locked = await payrollService.isPayrollLockedForMonth(
    user.companyId,
    employee._id,
    date.getMonth() + 1,
    date.getFullYear()
  );
  if (locked) throw new ApiError(409, 'Cannot modify attendance for a locked payroll month');

  const now = new Date();

  const result = await Attendance.updateOne(
    {
      companyId: user.companyId,
      employeeId: employee._id,
      date,
    },
    {
      $setOnInsert: {
        companyId: user.companyId,
        employeeId: employee._id,
        date,
        checkIn: now,
        checkOut: null,
        totalHours: 0,
        overtimeHours: 0,
        status: 'ABSENT',
        ipAddress: context.ipAddress,
        location: context.location,
      },
    },
    { upsert: true }
  );

  if (result.upsertedCount === 0) {
    throw new ApiError(409, 'Already checked in for today');
  }

  return Attendance.findOne({ companyId: user.companyId, employeeId: employee._id, date })
    .select('-__v')
    .lean();
}

async function checkOut(user, context = {}) {
  if (user.role !== 'EMPLOYEE') {
    throw new ApiError(403, 'Only EMPLOYEE can check out');
  }

  const employee = await getEmployeeFromUser(user);
  const date = startOfDay(new Date());
  const locked = await payrollService.isPayrollLockedForMonth(
    user.companyId,
    employee._id,
    date.getMonth() + 1,
    date.getFullYear()
  );
  if (locked) throw new ApiError(409, 'Cannot modify attendance for a locked payroll month');

  const record = await Attendance.findOne({
    companyId: user.companyId,
    employeeId: employee._id,
    date,
  })
    .select('_id checkIn checkOut')
    .lean();

  if (!record) throw new ApiError(404, 'No check-in found for today');
  if (!record.checkIn) throw new ApiError(409, 'Check-in missing for today');
  if (record.checkOut) throw new ApiError(409, 'Already checked out for today');

  const checkoutTime = new Date();
  const totalHoursRaw = Math.max((checkoutTime.getTime() - new Date(record.checkIn).getTime()) / 3600000, 0);
  const totalHours = roundHours(totalHoursRaw);
  const overtimeHours = totalHours > env.attendanceFullDayHours ? roundHours(totalHours - env.attendanceFullDayHours) : 0;
  const status = calculateStatus(new Date(record.checkIn), totalHours);

  const updated = await Attendance.findOneAndUpdate(
    {
      _id: record._id,
      companyId: user.companyId,
      checkOut: null,
    },
    {
      $set: {
        checkOut: checkoutTime,
        totalHours,
        overtimeHours,
        status,
        location: context.location || undefined,
      },
    },
    { new: true }
  )
    .select('-__v')
    .lean();

  if (!updated) throw new ApiError(409, 'Check-out already completed');
  if (['LATE', 'ABSENT'].includes(updated.status)) {
    emitEvent('ATTENDANCE_ANOMALY', {
      companyId: user.companyId,
      employeeId: employee._id,
      status: updated.status,
      metadata: { attendanceId: updated._id },
    });
  }
  return updated;
}

async function getAttendanceList(queryParams, user) {
  const { page, limit, skip } = getPagination(queryParams);
  const sort = getSort(queryParams.sortBy, queryParams.order);

  const scopedFilter = await getScopedEmployeeFilter(user, queryParams.employeeId);
  const filters = { companyId: user.companyId, ...scopedFilter };

  if (queryParams.status) filters.status = queryParams.status;
  if (queryParams.dateFrom || queryParams.dateTo) {
    filters.date = {};
    if (queryParams.dateFrom) filters.date.$gte = startOfDay(queryParams.dateFrom);
    if (queryParams.dateTo) filters.date.$lte = endOfDay(queryParams.dateTo);
  }

  const projection = 'companyId employeeId date checkIn checkOut totalHours overtimeHours status ipAddress location createdAt updatedAt';

  const [items, total] = await Promise.all([
    Attendance.find(filters)
      .select(projection)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Attendance.countDocuments(filters),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

async function getAttendanceSummary(user, queryParams) {
  const scopedFilter = await getScopedEmployeeFilter(user, queryParams.employeeId);
  const match = { companyId: user.companyId, ...scopedFilter };

  if (queryParams.dateFrom || queryParams.dateTo) {
    match.date = {};
    if (queryParams.dateFrom) match.date.$gte = startOfDay(queryParams.dateFrom);
    if (queryParams.dateTo) match.date.$lte = endOfDay(queryParams.dateTo);
  }

  const [result] = await Attendance.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalPresentDays: {
          $sum: {
            $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0],
          },
        },
        totalAbsentDays: {
          $sum: {
            $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0],
          },
        },
        totalLateDays: {
          $sum: {
            $cond: [{ $eq: ['$status', 'LATE'] }, 1, 0],
          },
        },
        totalOvertimeHours: { $sum: '$overtimeHours' },
      },
    },
  ]);

  return {
    totalPresentDays: result?.totalPresentDays || 0,
    totalAbsentDays: result?.totalAbsentDays || 0,
    totalLateDays: result?.totalLateDays || 0,
    totalOvertimeHours: roundHours(result?.totalOvertimeHours || 0),
  };
}

async function markAbsentForDate(date) {
  const targetDate = startOfDay(date);

  const activeEmployees = await Employee.find({ status: 'ACTIVE' })
    .select('_id companyId')
    .lean();

  if (!activeEmployees.length) {
    return { inserted: 0, date: targetDate };
  }

  const ops = activeEmployees.map((employee) => ({
    updateOne: {
      filter: {
        companyId: employee.companyId,
        employeeId: employee._id,
        date: targetDate,
      },
      update: {
        $setOnInsert: {
          companyId: employee.companyId,
          employeeId: employee._id,
          date: targetDate,
          totalHours: 0,
          overtimeHours: 0,
          status: 'ABSENT',
          checkOut: null,
        },
      },
      upsert: true,
    },
  }));

  const result = await Attendance.bulkWrite(ops, { ordered: false });
  return {
    inserted: result.upsertedCount || 0,
    date: targetDate,
  };
}

module.exports = {
  checkIn,
  checkOut,
  getAttendanceList,
  getAttendanceSummary,
  markAbsentForDate,
};
