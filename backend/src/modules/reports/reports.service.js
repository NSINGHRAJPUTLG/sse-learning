const mongoose = require('mongoose');
const ApiError = require('../../utils/ApiError');
const { Employee } = require('../employee/employee.model');
const Department = require('../department/department.model');
const { Attendance } = require('../attendance/attendance.model');
const { Leave } = require('../leave/leave.model');
const LeaveType = require('../leave/leaveType.model');
const { Payroll } = require('../payroll/payroll.model');

function getYearRange(year) {
  const start = new Date(year, 0, 1, 0, 0, 0, 0);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  return { start, end };
}

function getMonthRange(month, year) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

function toObjectIdList(list) {
  return list.map((id) => new mongoose.Types.ObjectId(id));
}

async function getScope(user) {
  const base = { companyId: user.companyId, role: user.role };

  if (['HR_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return { ...base, type: 'company' };
  }

  const actorEmployee = await Employee.findOne({ companyId: user.companyId, userId: user.userId })
    .select('_id')
    .lean();

  if (!actorEmployee) {
    throw new ApiError(404, 'Employee profile not found');
  }

  if (user.role === 'EMPLOYEE') {
    return { ...base, type: 'self', employeeIds: [String(actorEmployee._id)] };
  }

  if (user.role === 'MANAGER') {
    const team = await Employee.aggregate([
      {
        $match: {
          companyId: user.companyId,
          reportingManagerId: actorEmployee._id,
        },
      },
      {
        $project: { _id: 1 },
      },
    ]);

    return {
      ...base,
      type: 'team',
      employeeIds: team.map((t) => String(t._id)),
    };
  }

  throw new ApiError(403, 'Unauthorized role');
}

function scopedEmployeeMatch(scope) {
  const match = { companyId: scope.companyId };
  if (scope.type === 'self' || scope.type === 'team') {
    match._id = { $in: toObjectIdList(scope.employeeIds || []) };
  }
  return match;
}

function scopedChildMatch(scope, field = 'employeeId') {
  const match = { companyId: scope.companyId };
  if (scope.type === 'self' || scope.type === 'team') {
    match[field] = { $in: toObjectIdList(scope.employeeIds || []) };
  }
  return match;
}

async function getEmployeeStats(user, query) {
  const scope = await getScope(user);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  const employeeMatch = scopedEmployeeMatch(scope);

  if (query.fromDate || query.toDate) {
    employeeMatch.createdAt = {};
    if (query.fromDate) employeeMatch.createdAt.$gte = new Date(query.fromDate);
    if (query.toDate) employeeMatch.createdAt.$lte = new Date(query.toDate);
  }

  const [result] = await Employee.aggregate([
    { $match: employeeMatch },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              totalEmployees: { $sum: 1 },
              activeEmployees: {
                $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] },
              },
            },
          },
        ],
        newJoineesThisMonth: [
          { $match: { createdAt: { $gte: monthStart } } },
          { $count: 'count' },
        ],
        employeesByDepartment: [
          {
            $group: {
              _id: '$departmentId',
              count: { $sum: 1 },
            },
          },
          {
            $lookup: {
              from: Department.collection.name,
              localField: '_id',
              foreignField: '_id',
              as: 'department',
            },
          },
          {
            $project: {
              _id: 0,
              department: {
                $ifNull: [{ $arrayElemAt: ['$department.name', 0] }, 'Unassigned'],
              },
              count: 1,
            },
          },
          { $sort: { count: -1 } },
        ],
      },
    },
  ]);

  const totals = result?.totals?.[0] || { totalEmployees: 0, activeEmployees: 0 };

  return {
    totalEmployees: totals.totalEmployees || 0,
    activeEmployees: totals.activeEmployees || 0,
    inactiveEmployees: Math.max((totals.totalEmployees || 0) - (totals.activeEmployees || 0), 0),
    newJoineesThisMonth: result?.newJoineesThisMonth?.[0]?.count || 0,
    employeesByDepartment: result?.employeesByDepartment || [],
  };
}

async function getAttendanceSummary(user, month, year) {
  const m = Number(month || new Date().getMonth() + 1);
  const y = Number(year || new Date().getFullYear());
  const { start, end } = getMonthRange(m, y);

  const scope = await getScope(user);
  const match = {
    ...scopedChildMatch(scope, 'employeeId'),
    date: { $gte: start, $lte: end },
  };

  const [result] = await Attendance.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalPresent: {
          $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] },
        },
        totalAbsent: {
          $sum: { $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0] },
        },
        totalLate: {
          $sum: { $cond: [{ $eq: ['$status', 'LATE'] }, 1, 0] },
        },
        totalOvertimeHours: { $sum: '$overtimeHours' },
        averageWorkHours: { $avg: '$totalHours' },
      },
    },
  ]);

  return {
    totalPresent: result?.totalPresent || 0,
    totalAbsent: result?.totalAbsent || 0,
    totalLate: result?.totalLate || 0,
    totalOvertimeHours: Math.round((result?.totalOvertimeHours || 0) * 100) / 100,
    averageWorkHours: Math.round((result?.averageWorkHours || 0) * 100) / 100,
  };
}

async function getLeaveSummary(user, year) {
  const y = Number(year || new Date().getFullYear());
  const { start, end } = getYearRange(y);

  const scope = await getScope(user);
  const match = {
    ...scopedChildMatch(scope, 'employeeId'),
    startDate: { $gte: start, $lte: end },
  };

  const [result] = await Leave.aggregate([
    { $match: match },
    {
      $facet: {
        overall: [
          {
            $group: {
              _id: null,
              totalLeavesApplied: { $sum: 1 },
              totalApproved: {
                $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] },
              },
              totalRejected: {
                $sum: { $cond: [{ $eq: ['$status', 'REJECTED'] }, 1, 0] },
              },
            },
          },
        ],
        mostUsedLeaveType: [
          {
            $group: {
              _id: '$leaveTypeId',
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 1 },
          {
            $lookup: {
              from: LeaveType.collection.name,
              localField: '_id',
              foreignField: '_id',
              as: 'leaveType',
            },
          },
          {
            $project: {
              _id: 0,
              leaveType: { $ifNull: [{ $arrayElemAt: ['$leaveType.name', 0] }, 'UNKNOWN'] },
              count: 1,
            },
          },
        ],
        monthlyLeaveTrend: [
          {
            $group: {
              _id: { $month: '$startDate' },
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              month: '$_id',
              count: 1,
            },
          },
          { $sort: { month: 1 } },
        ],
      },
    },
  ]);

  const overall = result?.overall?.[0] || {
    totalLeavesApplied: 0,
    totalApproved: 0,
    totalRejected: 0,
  };

  return {
    totalLeavesApplied: overall.totalLeavesApplied || 0,
    totalApproved: overall.totalApproved || 0,
    totalRejected: overall.totalRejected || 0,
    mostUsedLeaveType: result?.mostUsedLeaveType?.[0]?.leaveType || null,
    monthlyLeaveTrend: result?.monthlyLeaveTrend || [],
  };
}

async function getPayrollSummary(user, year) {
  if (!['HR_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    throw new ApiError(403, 'Payroll insights restricted to HR_ADMIN and SUPER_ADMIN');
  }

  const y = Number(year || new Date().getFullYear());
  const scope = await getScope(user);

  const match = {
    ...scopedChildMatch(scope, 'employeeId'),
    year: y,
  };

  const [result] = await Payroll.aggregate([
    { $match: match },
    {
      $facet: {
        overall: [
          {
            $group: {
              _id: null,
              totalPayrollCost: { $sum: '$grossSalary' },
              totalNetPaid: { $sum: '$netSalary' },
              averageSalary: { $avg: '$netSalary' },
            },
          },
        ],
        highestPaidEmployee: [
          { $sort: { netSalary: -1 } },
          { $limit: 1 },
          {
            $lookup: {
              from: Employee.collection.name,
              localField: 'employeeId',
              foreignField: '_id',
              as: 'employee',
            },
          },
          {
            $project: {
              _id: 0,
              employeeId: 1,
              name: {
                $concat: [
                  { $ifNull: [{ $arrayElemAt: ['$employee.firstName', 0] }, ''] },
                  ' ',
                  { $ifNull: [{ $arrayElemAt: ['$employee.lastName', 0] }, ''] },
                ],
              },
              netSalary: 1,
            },
          },
        ],
        monthlyPayrollTrend: [
          {
            $group: {
              _id: '$month',
              total: { $sum: '$netSalary' },
            },
          },
          {
            $project: {
              _id: 0,
              month: '$_id',
              total: 1,
            },
          },
          { $sort: { month: 1 } },
        ],
      },
    },
  ]);

  const overall = result?.overall?.[0] || { totalPayrollCost: 0, totalNetPaid: 0, averageSalary: 0 };

  return {
    totalPayrollCost: Math.round((overall.totalPayrollCost || 0) * 100) / 100,
    totalNetPaid: Math.round((overall.totalNetPaid || 0) * 100) / 100,
    averageSalary: Math.round((overall.averageSalary || 0) * 100) / 100,
    highestPaidEmployee: result?.highestPaidEmployee?.[0] || null,
    monthlyPayrollTrend: result?.monthlyPayrollTrend || [],
  };
}

async function getAttrition(user, year) {
  if (!['HR_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    throw new ApiError(403, 'Attrition insights restricted to HR_ADMIN and SUPER_ADMIN');
  }

  const y = Number(year || new Date().getFullYear());
  const { start, end } = getYearRange(y);

  const [result] = await Employee.aggregate([
    { $match: { companyId: user.companyId } },
    {
      $facet: {
        employeesLeftDuringPeriod: [
          {
            $match: {
              status: { $in: ['TERMINATED', 'RESIGNED'] },
              updatedAt: { $gte: start, $lte: end },
            },
          },
          { $count: 'count' },
        ],
        startHeadcount: [
          { $match: { createdAt: { $lte: start } } },
          { $count: 'count' },
        ],
        endHeadcount: [
          { $match: { createdAt: { $lte: end }, status: { $nin: ['TERMINATED', 'RESIGNED'] } } },
          { $count: 'count' },
        ],
      },
    },
  ]);

  const left = result?.employeesLeftDuringPeriod?.[0]?.count || 0;
  const startCount = result?.startHeadcount?.[0]?.count || 0;
  const endCount = result?.endHeadcount?.[0]?.count || 0;

  const averageEmployees = (startCount + endCount) / 2;
  const attritionRate = averageEmployees > 0 ? (left / averageEmployees) * 100 : 0;

  return {
    employeesLeftDuringPeriod: left,
    averageEmployees: Math.round(averageEmployees * 100) / 100,
    attritionRate: Math.round(attritionRate * 100) / 100,
  };
}

async function getDashboard(user, query) {
  const month = Number(query.month || new Date().getMonth() + 1);
  const year = Number(query.year || new Date().getFullYear());
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const scope = await getScope(user);

  const [employeeStats, attendanceTodayAgg, pendingLeaveAgg, payrollThisMonthAgg, recentJoinees] = await Promise.all([
    getEmployeeStats(user, {}),
    Attendance.aggregate([
      {
        $match: {
          ...scopedChildMatch(scope, 'employeeId'),
          date: { $gte: todayStart, $lte: todayEnd },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
    Leave.aggregate([
      {
        $match: {
          ...scopedChildMatch(scope, 'employeeId'),
          status: 'PENDING',
        },
      },
      { $count: 'count' },
    ]),
    Payroll.aggregate([
      {
        $match: {
          ...scopedChildMatch(scope, 'employeeId'),
          month,
          year,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$netSalary' },
        },
      },
    ]),
    Employee.aggregate([
      {
        $match: {
          ...scopedEmployeeMatch(scope),
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 1,
          employeeId: 1,
          firstName: 1,
          lastName: 1,
          joiningDate: 1,
          status: 1,
        },
      },
    ]),
  ]);

  return {
    employeeStats,
    attendanceToday: attendanceTodayAgg,
    pendingLeaveRequests: pendingLeaveAgg?.[0]?.count || 0,
    payrollThisMonth: Math.round((payrollThisMonthAgg?.[0]?.total || 0) * 100) / 100,
    recentJoinees,
  };
}

module.exports = {
  getEmployeeStats,
  getAttendanceSummary,
  getLeaveSummary,
  getPayrollSummary,
  getAttrition,
  getDashboard,
};
