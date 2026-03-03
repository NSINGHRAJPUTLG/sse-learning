const mongoose = require('mongoose');
const ApiError = require('../../utils/ApiError');
const SalaryStructure = require('./salaryStructure.model');
const { Payroll } = require('./payroll.model');
const Payslip = require('./payslip.model');
const { Employee } = require('../employee/employee.model');
const { Attendance } = require('../attendance/attendance.model');
const { Leave } = require('../leave/leave.model');
const { getPagination, getSort } = require('../../utils/pagination');
const { emitEvent } = require('../notifications/notification.events');

function roundCurrency(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function monthRange(month, year) {
  return {
    start: new Date(year, month - 1, 1, 0, 0, 0, 0),
    end: new Date(year, month, 0, 23, 59, 59, 999),
  };
}

function getDaysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

function assertPayrollAdmin(user) {
  if (!['HR_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    throw new ApiError(403, 'Only HR_ADMIN or SUPER_ADMIN can perform this action');
  }
}

async function getScopedPayrollFilter(user, requestedEmployeeId) {
  if (['HR_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return requestedEmployeeId ? { employeeId: requestedEmployeeId } : {};
  }

  if (user.role === 'EMPLOYEE') {
    const self = await Employee.findOne({ companyId: user.companyId, userId: user.userId }).select('_id').lean();
    if (!self) throw new ApiError(404, 'Employee profile not found');
    if (requestedEmployeeId && String(requestedEmployeeId) !== String(self._id)) {
      throw new ApiError(403, 'Employees can only access self payroll');
    }
    return { employeeId: self._id };
  }

  if (user.role === 'MANAGER') {
    const managerEmp = await Employee.findOne({ companyId: user.companyId, userId: user.userId }).select('_id').lean();
    if (!managerEmp) throw new ApiError(404, 'Manager profile not found');

    const team = await Employee.find({ companyId: user.companyId, reportingManagerId: managerEmp._id })
      .select('_id')
      .lean();
    const teamIds = team.map((x) => x._id);

    if (requestedEmployeeId && !teamIds.some((id) => String(id) === String(requestedEmployeeId))) {
      throw new ApiError(403, 'Managers can only access team payroll');
    }

    return requestedEmployeeId ? { employeeId: requestedEmployeeId } : { employeeId: { $in: teamIds } };
  }

  throw new ApiError(403, 'Unauthorized role');
}

async function createOrUpdateSalaryStructure(user, payload) {
  assertPayrollAdmin(user);

  const employee = await Employee.findOne({
    _id: payload.employeeId,
    companyId: user.companyId,
    status: { $ne: 'TERMINATED' },
  })
    .select('_id')
    .lean();

  if (!employee) throw new ApiError(404, 'Employee not found');

  const lockedExists = await Payroll.findOne({
    companyId: user.companyId,
    employeeId: payload.employeeId,
    status: { $in: ['LOCKED', 'PAID'] },
  }).lean();

  const existing = await SalaryStructure.findOne({ companyId: user.companyId, employeeId: payload.employeeId });
  if (existing && lockedExists) {
    throw new ApiError(409, 'Cannot modify salary structure after payroll is locked/paid');
  }

  const doc = await SalaryStructure.findOneAndUpdate(
    { companyId: user.companyId, employeeId: payload.employeeId },
    {
      $set: {
        companyId: user.companyId,
        employeeId: payload.employeeId,
        basic: payload.basic,
        hra: payload.hra || 0,
        allowances: payload.allowances || 0,
        bonus: payload.bonus || 0,
        deductions: payload.deductions || 0,
        taxPercentage: payload.taxPercentage || 0,
        effectiveFrom: payload.effectiveFrom,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  ).lean();

  return doc;
}

async function generatePayroll(user, month, year) {
  assertPayrollAdmin(user);

  const now = new Date();
  if (year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1)) {
    throw new ApiError(400, 'Cannot generate payroll for a future month');
  }

  const existingBatch = await Payroll.findOne({ companyId: user.companyId, month, year }).lean();
  if (existingBatch) {
    throw new ApiError(409, 'Payroll already generated for this month/year');
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const employees = await Employee.find({ companyId: user.companyId, status: 'ACTIVE' })
      .select('_id')
      .session(session)
      .lean();

    if (!employees.length) {
      throw new ApiError(400, 'No active employees found');
    }

    const employeeIds = employees.map((e) => e._id);

    const salaryStructures = await SalaryStructure.find({
      companyId: user.companyId,
      employeeId: { $in: employeeIds },
    })
      .select('employeeId basic hra allowances bonus deductions taxPercentage')
      .session(session)
      .lean();

    const salaryMap = new Map(salaryStructures.map((s) => [String(s.employeeId), s]));

    const missingStructure = employeeIds.find((id) => !salaryMap.has(String(id)));
    if (missingStructure) {
      throw new ApiError(400, `Salary structure missing for employee ${String(missingStructure)}`);
    }

    const { start, end } = monthRange(month, year);

    const attendanceAgg = await Attendance.aggregate([
      {
        $match: {
          companyId: user.companyId,
          employeeId: { $in: employeeIds },
          date: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$employeeId',
          presentDays: {
            $sum: {
              $cond: [{ $in: ['$status', ['PRESENT', 'HALF_DAY', 'LATE']] }, 1, 0],
            },
          },
          absentDays: {
            $sum: {
              $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0],
            },
          },
          overtimeHours: { $sum: '$overtimeHours' },
        },
      },
    ]).session(session);

    const attendanceMap = new Map(attendanceAgg.map((a) => [String(a._id), a]));

    const leaveAgg = await Leave.aggregate([
      {
        $match: {
          companyId: user.companyId,
          employeeId: { $in: employeeIds },
          status: 'APPROVED',
          startDate: { $lte: end },
          endDate: { $gte: start },
        },
      },
      {
        $project: {
          employeeId: 1,
          overlapStart: {
            $cond: [{ $gt: ['$startDate', start] }, '$startDate', start],
          },
          overlapEnd: {
            $cond: [{ $lt: ['$endDate', end] }, '$endDate', end],
          },
        },
      },
      {
        $project: {
          employeeId: 1,
          approvedLeaveDays: {
            $add: [
              {
                $floor: {
                  $divide: [{ $subtract: ['$overlapEnd', '$overlapStart'] }, 1000 * 60 * 60 * 24],
                },
              },
              1,
            ],
          },
        },
      },
      {
        $group: {
          _id: '$employeeId',
          approvedLeaveDays: { $sum: '$approvedLeaveDays' },
        },
      },
    ]).session(session);

    const leaveMap = new Map(leaveAgg.map((l) => [String(l._id), l.approvedLeaveDays]));

    const totalWorkingDays = getDaysInMonth(month, year);
    const generatedAt = new Date();

    const ops = employeeIds.map((employeeId) => {
      const salary = salaryMap.get(String(employeeId));
      const attendance = attendanceMap.get(String(employeeId)) || {
        presentDays: 0,
        absentDays: totalWorkingDays,
        overtimeHours: 0,
      };

      const approvedLeaveDays = Number(leaveMap.get(String(employeeId)) || 0);
      const adjustedAbsentDays = Math.max(attendance.absentDays - approvedLeaveDays, 0);

      const monthlyGross =
        Number(salary.basic) +
        Number(salary.hra || 0) +
        Number(salary.allowances || 0) +
        Number(salary.bonus || 0);

      const perDaySalary = monthlyGross / totalWorkingDays;
      const deductionForAbsence = perDaySalary * adjustedAbsentDays;
      const fixedDeductions = Number(salary.deductions || 0);

      const perHour = perDaySalary / 8;
      const overtimeAmount = perHour * Number(attendance.overtimeHours || 0);

      const grossSalary = roundCurrency(monthlyGross);
      const totalDeductions = roundCurrency(fixedDeductions + deductionForAbsence);
      const taxAmount = roundCurrency(((grossSalary - totalDeductions) * Number(salary.taxPercentage || 0)) / 100);

      const netSalary = roundCurrency(grossSalary - totalDeductions + overtimeAmount - taxAmount);

      return {
        insertOne: {
          document: {
            companyId: user.companyId,
            employeeId,
            month,
            year,
            totalWorkingDays,
            presentDays: Number(attendance.presentDays || 0),
            absentDays: adjustedAbsentDays,
            overtimeHours: roundCurrency(Number(attendance.overtimeHours || 0)),
            grossSalary,
            totalDeductions,
            netSalary: netSalary < 0 ? 0 : netSalary,
            status: 'GENERATED',
            generatedAt,
          },
        },
      };
    });

    await Payroll.bulkWrite(ops, { session, ordered: false });
    await session.commitTransaction();

    for (const employeeId of employeeIds) {
      emitEvent('PAYROLL_GENERATED', {
        companyId: user.companyId,
        employeeId,
        month,
        year,
        metadata: { month, year },
      });
    }

    return {
      generatedCount: ops.length,
      month,
      year,
      companyId: user.companyId,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

async function lockPayroll(user, payrollId) {
  assertPayrollAdmin(user);

  const payroll = await Payroll.findOne({ _id: payrollId, companyId: user.companyId });
  if (!payroll) throw new ApiError(404, 'Payroll not found');
  if (payroll.status !== 'GENERATED') throw new ApiError(409, 'Only GENERATED payroll can be locked');

  payroll.status = 'LOCKED';
  payroll.lockedAt = new Date();
  await payroll.save();

  return payroll.toObject();
}

async function markAsPaid(user, payrollId) {
  assertPayrollAdmin(user);

  const payroll = await Payroll.findOne({ _id: payrollId, companyId: user.companyId });
  if (!payroll) throw new ApiError(404, 'Payroll not found');
  if (payroll.status !== 'LOCKED') throw new ApiError(409, 'Only LOCKED payroll can be marked as PAID');

  payroll.status = 'PAID';
  payroll.paidAt = new Date();
  await payroll.save();
  emitEvent('PAYROLL_PAID', {
    companyId: user.companyId,
    employeeId: payroll.employeeId,
    month: payroll.month,
    year: payroll.year,
    metadata: { payrollId: payroll._id },
  });

  return payroll.toObject();
}

async function getPayrollList(user, queryParams) {
  const { page, limit, skip } = getPagination(queryParams);
  const sort = getSort(queryParams.sortBy, queryParams.order);

  const scoped = await getScopedPayrollFilter(user, queryParams.employeeId);
  const filters = { companyId: user.companyId, ...scoped };

  if (queryParams.month) filters.month = Number(queryParams.month);
  if (queryParams.year) filters.year = Number(queryParams.year);
  if (queryParams.status) filters.status = queryParams.status;

  const [items, total] = await Promise.all([
    Payroll.find(filters)
      .select('companyId employeeId month year totalWorkingDays presentDays absentDays overtimeHours grossSalary totalDeductions netSalary status generatedAt lockedAt paidAt')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Payroll.countDocuments(filters),
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

async function getPayrollById(user, payrollId) {
  const scoped = await getScopedPayrollFilter(user, null);

  const filters = { _id: payrollId, companyId: user.companyId, ...scoped };

  const payroll = await Payroll.findOne(filters)
    .select('companyId employeeId month year totalWorkingDays presentDays absentDays overtimeHours grossSalary totalDeductions netSalary status generatedAt lockedAt paidAt')
    .lean();

  if (!payroll) throw new ApiError(404, 'Payroll not found');
  return payroll;
}

async function generatePayslip(user, payrollId) {
  const payroll = await getPayrollById(user, payrollId);

  if (!['HR_ADMIN', 'SUPER_ADMIN', 'EMPLOYEE', 'MANAGER'].includes(user.role)) {
    throw new ApiError(403, 'Unauthorized');
  }

  const existing = await Payslip.findOne({ payrollId: payroll._id, companyId: user.companyId }).lean();
  if (existing) return existing;

  const monthlyGross = payroll.grossSalary;
  const perDay = payroll.totalWorkingDays ? monthlyGross / payroll.totalWorkingDays : 0;
  const perHour = perDay / 8;
  const overtimeAmount = roundCurrency(perHour * payroll.overtimeHours);
  const taxApprox = roundCurrency(monthlyGross - payroll.totalDeductions + overtimeAmount - payroll.netSalary);

  const breakdown = {
    earnings: {
      grossSalary: payroll.grossSalary,
    },
    deductions: {
      totalDeductions: payroll.totalDeductions,
    },
    overtime: {
      hours: payroll.overtimeHours,
      amount: overtimeAmount,
    },
    tax: {
      amount: taxApprox,
    },
    netSalary: payroll.netSalary,
  };

  const payslip = await Payslip.create({
    payrollId: payroll._id,
    companyId: payroll.companyId,
    employeeId: payroll.employeeId,
    breakdown,
    pdfUrl: '',
  });

  return payslip.toObject();
}

async function isPayrollLockedForMonth(companyId, employeeId, month, year) {
  const locked = await Payroll.findOne({
    companyId,
    employeeId,
    month,
    year,
    status: { $in: ['LOCKED', 'PAID'] },
  })
    .select('_id')
    .lean();

  return Boolean(locked);
}

module.exports = {
  createOrUpdateSalaryStructure,
  generatePayroll,
  lockPayroll,
  markAsPaid,
  getPayrollList,
  getPayrollById,
  generatePayslip,
  isPayrollLockedForMonth,
};
