const mongoose = require('mongoose');
const ApiError = require('../../utils/ApiError');
const { Leave } = require('./leave.model');
const LeaveType = require('./leaveType.model');
const LeaveBalance = require('./leaveBalance.model');
const { Employee } = require('../employee/employee.model');
const { getPagination, getSort } = require('../../utils/pagination');
const { emitEvent } = require('../notifications/notification.events');

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function daysBetweenInclusive(startDate, endDate) {
  return Math.floor((endOfDay(endDate) - startOfDay(startDate)) / (1000 * 60 * 60 * 24)) + 1;
}

async function getEmployeeByUser(user, session = null) {
  const employee = await Employee.findOne({
    companyId: user.companyId,
    userId: user.userId,
  })
    .select('_id companyId userId status reportingManagerId')
    .session(session)
    .lean();

  if (!employee) throw new ApiError(404, 'Employee not found');
  return employee;
}

async function getScopedEmployeeFilter(user, requestedEmployeeId) {
  if (['HR_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return requestedEmployeeId ? { employeeId: requestedEmployeeId } : {};
  }

  if (user.role === 'EMPLOYEE') {
    const employee = await getEmployeeByUser(user);
    if (requestedEmployeeId && String(requestedEmployeeId) !== String(employee._id)) {
      throw new ApiError(403, 'Employees can only access their own leaves');
    }
    return { employeeId: employee._id };
  }

  if (user.role === 'MANAGER') {
    const managerEmployee = await getEmployeeByUser(user);
    const team = await Employee.find({
      companyId: user.companyId,
      reportingManagerId: managerEmployee._id,
    })
      .select('_id')
      .lean();
    const teamIds = team.map((x) => x._id);

    if (requestedEmployeeId && !teamIds.some((id) => String(id) === String(requestedEmployeeId))) {
      throw new ApiError(403, 'Managers can only access team leaves');
    }

    return requestedEmployeeId ? { employeeId: requestedEmployeeId } : { employeeId: { $in: teamIds } };
  }

  throw new ApiError(403, 'Unauthorized role');
}

async function ensureLeaveType(companyId, leaveTypeId, session = null) {
  const leaveType = await LeaveType.findOne({ _id: leaveTypeId, companyId }).session(session).lean();
  if (!leaveType) throw new ApiError(400, 'Invalid leave type');
  return leaveType;
}

async function ensureLeaveBalance(companyId, employeeId, leaveType, year, session = null) {
  let balance = await LeaveBalance.findOne({ companyId, employeeId, leaveTypeId: leaveType._id, year }).session(session);
  if (!balance) {
    balance = await LeaveBalance.create(
      [
        {
          companyId,
          employeeId,
          leaveTypeId: leaveType._id,
          totalAllocated: leaveType.yearlyQuota,
          used: 0,
          remaining: leaveType.yearlyQuota,
          year,
        },
      ],
      { session }
    ).then((docs) => docs[0]);
  }
  return balance;
}

async function createLeaveType(user, payload) {
  if (!['SUPER_ADMIN', 'HR_ADMIN'].includes(user.role)) {
    throw new ApiError(403, 'Only SUPER_ADMIN or HR_ADMIN can create leave types');
  }

  const name = String(payload.name).trim().toUpperCase();
  const exists = await LeaveType.findOne({ companyId: user.companyId, name }).lean();
  if (exists) throw new ApiError(409, 'Leave type already exists');

  return LeaveType.create({
    companyId: user.companyId,
    name,
    yearlyQuota: payload.yearlyQuota,
    carryForwardAllowed: payload.carryForwardAllowed ?? false,
    requiresApproval: payload.requiresApproval ?? true,
  });
}

async function listLeaveTypes(user) {
  return LeaveType.find({ companyId: user.companyId }).sort({ name: 1 }).lean();
}

async function applyLeave(user, data) {
  if (user.role !== 'EMPLOYEE') {
    throw new ApiError(403, 'Only EMPLOYEE can apply for leave');
  }

  const employee = await getEmployeeByUser(user);
  if (employee.status !== 'ACTIVE') throw new ApiError(403, 'Only ACTIVE employees can apply leave');

  const startDate = startOfDay(data.startDate);
  const endDate = endOfDay(data.endDate);
  const today = startOfDay(new Date());

  if (startDate < today) throw new ApiError(400, 'Cannot apply leave for past date');
  if (startDate > endDate) throw new ApiError(400, 'startDate must be before or equal to endDate');

  const leaveType = await ensureLeaveType(user.companyId, data.leaveTypeId);

  const overlap = await Leave.findOne({
    companyId: user.companyId,
    employeeId: employee._id,
    status: { $in: ['PENDING', 'APPROVED'] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  }).lean();

  if (overlap) throw new ApiError(409, 'Overlapping leave request exists');

  const totalDays = daysBetweenInclusive(startDate, endDate);
  const year = startDate.getFullYear();

  const balance = await ensureLeaveBalance(user.companyId, employee._id, leaveType, year);
  if (balance.remaining < totalDays) throw new ApiError(400, 'Insufficient leave balance');

  return Leave.create({
    companyId: user.companyId,
    employeeId: employee._id,
    leaveTypeId: leaveType._id,
    startDate,
    endDate,
    totalDays,
    reason: data.reason,
    status: 'PENDING',
    appliedAt: new Date(),
  });
}

async function approveLeave(leaveId, approver) {
  if (!['MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'].includes(approver.role)) {
    throw new ApiError(403, 'Unauthorized to approve leave');
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const leave = await Leave.findOne({ _id: leaveId, companyId: approver.companyId }).session(session);
    if (!leave) throw new ApiError(404, 'Leave not found');
    if (leave.status !== 'PENDING') throw new ApiError(409, 'Only pending leaves can be approved');

    const employee = await Employee.findOne({ _id: leave.employeeId, companyId: approver.companyId })
      .select('_id reportingManagerId')
      .session(session)
      .lean();

    if (!employee) throw new ApiError(404, 'Employee not found for leave');

    if (approver.role === 'MANAGER') {
      const managerEmployee = await Employee.findOne({ companyId: approver.companyId, userId: approver.userId })
        .select('_id')
        .session(session)
        .lean();
      if (!managerEmployee) throw new ApiError(403, 'Manager employee profile missing');
      if (String(employee.reportingManagerId) !== String(managerEmployee._id)) {
        throw new ApiError(403, 'Managers can approve only team leave');
      }
      if (leave.managerApprovedBy) throw new ApiError(409, 'Leave already manager-approved');

      leave.managerApprovedBy = approver.userId;
      leave.managerApprovedAt = new Date();
      await leave.save({ session });

      await session.commitTransaction();
      return leave.toObject();
    }

    if (employee.reportingManagerId && !leave.managerApprovedBy) {
      throw new ApiError(409, 'Manager approval required before final approval');
    }

    const year = new Date(leave.startDate).getFullYear();
    const leaveType = await ensureLeaveType(approver.companyId, leave.leaveTypeId, session);
    const balance = await ensureLeaveBalance(approver.companyId, leave.employeeId, leaveType, year, session);

    if (balance.remaining < leave.totalDays) throw new ApiError(400, 'Insufficient leave balance at approval time');

    balance.used += leave.totalDays;
    balance.remaining = Math.max(balance.totalAllocated - balance.used, 0);
    await balance.save({ session });

    leave.status = 'APPROVED';
    leave.approvedBy = approver.userId;
    leave.approvedAt = new Date();
    await leave.save({ session });

    await session.commitTransaction();
    emitEvent('LEAVE_APPROVED', {
      companyId: approver.companyId,
      employeeId: leave.employeeId,
      leaveType: leaveType.name,
      startDate: new Date(leave.startDate).toISOString().slice(0, 10),
      endDate: new Date(leave.endDate).toISOString().slice(0, 10),
      metadata: { leaveId: leave._id, totalDays: leave.totalDays },
    });
    return leave.toObject();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

async function rejectLeave(leaveId, approver) {
  if (!['MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'].includes(approver.role)) {
    throw new ApiError(403, 'Unauthorized to reject leave');
  }

  const leave = await Leave.findOne({ _id: leaveId, companyId: approver.companyId });
  if (!leave) throw new ApiError(404, 'Leave not found');
  if (leave.status !== 'PENDING') throw new ApiError(409, 'Only pending leaves can be rejected');

  if (approver.role === 'MANAGER') {
    const managerEmployee = await Employee.findOne({ companyId: approver.companyId, userId: approver.userId })
      .select('_id')
      .lean();
    if (!managerEmployee) throw new ApiError(403, 'Manager employee profile missing');

    const employee = await Employee.findOne({ _id: leave.employeeId, companyId: approver.companyId })
      .select('reportingManagerId')
      .lean();

    if (!employee || String(employee.reportingManagerId) !== String(managerEmployee._id)) {
      throw new ApiError(403, 'Managers can reject only team leave');
    }
  }

  leave.status = 'REJECTED';
  leave.approvedBy = approver.userId;
  leave.approvedAt = new Date();
  await leave.save();
  emitEvent('LEAVE_REJECTED', {
    companyId: approver.companyId,
    employeeId: leave.employeeId,
    startDate: new Date(leave.startDate).toISOString().slice(0, 10),
    endDate: new Date(leave.endDate).toISOString().slice(0, 10),
    metadata: { leaveId: leave._id },
  });

  return leave.toObject();
}

async function cancelLeave(leaveId, user) {
  if (user.role !== 'EMPLOYEE') {
    throw new ApiError(403, 'Only EMPLOYEE can cancel leave');
  }

  const employee = await getEmployeeByUser(user);
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const leave = await Leave.findOne({
      _id: leaveId,
      companyId: user.companyId,
      employeeId: employee._id,
    }).session(session);

    if (!leave) throw new ApiError(404, 'Leave not found');
    if (leave.status !== 'APPROVED') throw new ApiError(409, 'Only approved leave can be cancelled');

    const today = startOfDay(new Date());
    if (startOfDay(leave.startDate) <= today) {
      throw new ApiError(400, 'Cannot cancel leave on or after start date');
    }

    const year = new Date(leave.startDate).getFullYear();
    const leaveType = await ensureLeaveType(user.companyId, leave.leaveTypeId, session);
    const balance = await ensureLeaveBalance(user.companyId, employee._id, leaveType, year, session);

    balance.used = Math.max(balance.used - leave.totalDays, 0);
    balance.remaining = Math.max(balance.totalAllocated - balance.used, 0);
    await balance.save({ session });

    leave.status = 'CANCELLED';
    await leave.save({ session });

    await session.commitTransaction();
    return leave.toObject();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

async function getLeaveList(queryParams, user) {
  const { page, limit, skip } = getPagination(queryParams);
  const sort = getSort(queryParams.sortBy, queryParams.order);

  const scoped = await getScopedEmployeeFilter(user, queryParams.employeeId);
  const filters = { companyId: user.companyId, ...scoped };

  if (queryParams.status) filters.status = queryParams.status;
  if (queryParams.dateFrom || queryParams.dateTo) {
    filters.startDate = {};
    if (queryParams.dateFrom) filters.startDate.$gte = startOfDay(queryParams.dateFrom);
    if (queryParams.dateTo) filters.startDate.$lte = endOfDay(queryParams.dateTo);
  }

  const [items, total] = await Promise.all([
    Leave.find(filters)
      .select('employeeId leaveTypeId startDate endDate totalDays reason status appliedAt approvedBy approvedAt managerApprovedBy managerApprovedAt')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Leave.countDocuments(filters),
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

async function getLeaveSummary(user, employeeId, yearInput) {
  const year = Number(yearInput || new Date().getFullYear());
  const scoped = await getScopedEmployeeFilter(user, employeeId);

  const match = { companyId: user.companyId, year, ...scoped };

  const [result] = await LeaveBalance.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalAllocated: { $sum: '$totalAllocated' },
        totalUsed: { $sum: '$used' },
        totalRemaining: { $sum: '$remaining' },
      },
    },
  ]);

  return {
    totalAllocated: result?.totalAllocated || 0,
    totalUsed: result?.totalUsed || 0,
    totalRemaining: result?.totalRemaining || 0,
  };
}

async function getLeaveCalendar(user, month, year) {
  const start = new Date(Number(year), Number(month) - 1, 1, 0, 0, 0, 0);
  const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);

  const scoped = await getScopedEmployeeFilter(user, null);
  const filters = {
    companyId: user.companyId,
    status: 'APPROVED',
    startDate: { $lte: end },
    endDate: { $gte: start },
    ...scoped,
  };

  return Leave.find(filters)
    .select('employeeId leaveTypeId startDate endDate totalDays status')
    .sort({ startDate: 1 })
    .lean();
}

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
