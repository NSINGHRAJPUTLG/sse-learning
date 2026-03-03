const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const ApiError = require('../../utils/ApiError');
const logger = require('../../utils/logger');
const { User } = require('../auth/auth.model');
const Department = require('../department/department.model');
const { Employee, Counter } = require('./employee.model');
const LeaveType = require('../leave/leaveType.model');
const LeaveBalance = require('../leave/leaveBalance.model');
const { getPagination, getSort } = require('../../utils/pagination');
const { emitEvent } = require('../notifications/notification.events');

const SALT_ROUNDS = 12;

const statusTransitions = {
  ACTIVE: ['ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED'],
  ON_LEAVE: ['ACTIVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED'],
  SUSPENDED: ['ACTIVE', 'TERMINATED', 'RESIGNED'],
  TERMINATED: [],
  RESIGNED: [],
};

function ensureCreateAccess(user) {
  if (!['SUPER_ADMIN', 'HR_ADMIN'].includes(user.role)) {
    throw new ApiError(403, 'Only SUPER_ADMIN or HR_ADMIN can create employees');
  }
}

function isTransactionUnsupported(error) {
  const message = String(error?.message || '');
  return (
    message.includes('Transaction numbers are only allowed on a replica set member or mongos') ||
    (message.toLowerCase().includes('transaction') && message.toLowerCase().includes('replica set'))
  );
}

async function generateEmployeeId(companyId, session) {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { companyId },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true, session }
  );

  const serial = String(counter.sequence).padStart(4, '0');
  return `HRM-${year}-${serial}`;
}

async function ensureDepartment(companyId, departmentId, session) {
  if (!departmentId) return;
  const dept = await Department.findOne({ _id: departmentId, companyId, isActive: true })
    .session(session || null)
    .lean();
  if (!dept) throw new ApiError(400, 'Invalid or inactive departmentId for company');
}

async function ensureValidReportingManager(companyId, reportingManagerId, employeeDocId, session) {
  if (!reportingManagerId) return;

  const manager = await Employee.findOne({ _id: reportingManagerId, companyId }).session(session || null).lean();
  if (!manager) throw new ApiError(400, 'Reporting manager not found');

  if (employeeDocId && String(manager._id) === String(employeeDocId)) {
    throw new ApiError(400, 'Employee cannot report to self');
  }

  if (!employeeDocId) return;

  const visited = new Set([String(employeeDocId)]);
  let current = manager;

  while (current && current.reportingManagerId) {
    const nextId = String(current.reportingManagerId);
    if (visited.has(nextId)) {
      throw new ApiError(400, 'Circular reporting structure detected');
    }

    visited.add(nextId);
    current = await Employee.findOne({ _id: current.reportingManagerId, companyId })
      .select('_id reportingManagerId')
      .session(session || null)
      .lean();
  }
}

async function initializeLeaveBalances(companyId, employeeId, session) {
  const leaveTypes = await LeaveType.find({ companyId }).select('_id yearlyQuota').session(session).lean();
  if (!leaveTypes.length) return;

  const year = new Date().getFullYear();
  const docs = leaveTypes.map((leaveType) => ({
    companyId,
    employeeId,
    leaveTypeId: leaveType._id,
    totalAllocated: leaveType.yearlyQuota,
    used: 0,
    remaining: leaveType.yearlyQuota,
    year,
  }));

  await LeaveBalance.insertMany(docs, { session, ordered: false });
}

function sanitizeUser(userDoc) {
  if (!userDoc) return null;
  const user = typeof userDoc.toObject === 'function' ? userDoc.toObject() : { ...userDoc };
  delete user.password;
  delete user.refreshToken;
  return user;
}

function buildScopedFilters(actor, query = {}) {
  const filters = { companyId: actor.companyId };

  if (query.departmentId) filters.departmentId = query.departmentId;
  if (query.status) filters.status = query.status;
  if (query.employmentType) filters.employmentType = query.employmentType;

  if (actor.role === 'MANAGER') {
    filters.reportingManagerId = actor.employeeRefId;
  }

  if (actor.role === 'EMPLOYEE') {
    filters.userId = actor.userId;
  }

  if (query.search) {
    const rx = new RegExp(query.search, 'i');
    filters.$or = [{ firstName: rx }, { lastName: rx }, { employeeId: rx }];
  }

  return filters;
}

async function getActorContext(actor) {
  const context = { ...actor };

  if (actor.role === 'MANAGER') {
    const managerEmployee = await Employee.findOne({ companyId: actor.companyId, userId: actor.userId })
      .select('_id employeeId')
      .lean();

    if (!managerEmployee) throw new ApiError(403, 'Manager profile not found');
    context.employeeRefId = managerEmployee._id;
    context.employeeCode = managerEmployee.employeeId;
  }

  return context;
}

async function createEmployee(data, actor) {
  ensureCreateAccess(actor);

  const companyId = actor.companyId;
  const persistEmployee = async (session = null) => {
    const existingUserQuery = User.findOne({ email: data.user.email, companyId });
    if (session) existingUserQuery.session(session);
    const existingUser = await existingUserQuery.lean();
    if (existingUser) throw new ApiError(409, 'User already exists for company');

    await ensureDepartment(companyId, data.departmentId, session);
    await ensureValidReportingManager(companyId, data.reportingManagerId, null, session);

    const hashedPassword = await bcrypt.hash(data.user.password, SALT_ROUNDS);
    const createUserOptions = session ? { session } : {};
    const createdUser = await User.create(
      [
        {
          companyId,
          email: data.user.email,
          password: hashedPassword,
          role: data.user.role,
          isActive: data.user.isActive ?? true,
        },
      ],
      createUserOptions
    );

    const employeeId = await generateEmployeeId(companyId, session);
    const createEmployeeOptions = session ? { session } : {};
    const createdEmployee = await Employee.create(
      [
        {
          companyId,
          userId: createdUser[0]._id,
          employeeId,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          departmentId: data.departmentId,
          designation: data.designation,
          reportingManagerId: data.reportingManagerId,
          joiningDate: data.joiningDate,
          employmentType: data.employmentType,
          status: data.status || 'ACTIVE',
          address: data.address,
          emergencyContact: data.emergencyContact,
          salaryStructureId: data.salaryStructureId,
        },
      ],
      createEmployeeOptions
    );

    await initializeLeaveBalances(companyId, createdEmployee[0]._id, session);

    return {
      user: sanitizeUser(createdUser[0]),
      employee: createdEmployee[0].toObject(),
    };
  };

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await persistEmployee(session);
    await session.commitTransaction();
    emitEvent('WELCOME_EMPLOYEE', {
      companyId,
      userId: result.employee.userId,
      name: `${result.employee.firstName} ${result.employee.lastName}`.trim(),
      metadata: { employeeId: result.employee._id },
    });
    return result;
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch (_) {
      // no-op
    }

    if (isTransactionUnsupported(error)) {
      logger.warn('Mongo transaction not supported in current topology, retrying employee create without transaction');
      const result = await persistEmployee(null);
      emitEvent('WELCOME_EMPLOYEE', {
        companyId,
        userId: result.employee.userId,
        name: `${result.employee.firstName} ${result.employee.lastName}`.trim(),
        metadata: { employeeId: result.employee._id },
      });
      return result;
    }

    throw error;
  } finally {
    await session.endSession();
  }
}

async function getEmployees(queryParams, actor) {
  const scopedActor = await getActorContext(actor);
  const { page, limit, skip } = getPagination(queryParams);
  const sort = getSort(queryParams.sortBy, queryParams.order);
  const filters = buildScopedFilters(scopedActor, queryParams);

  const [items, total] = await Promise.all([
    Employee.find(filters)
      .select('-__v')
      .populate({ path: 'userId', select: 'email role isActive createdAt updatedAt' })
      .populate({ path: 'departmentId', select: 'name managerId' })
      .populate({ path: 'reportingManagerId', select: 'employeeId firstName lastName designation' })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Employee.countDocuments(filters),
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

async function getEmployeeById(id, actor) {
  const scopedActor = await getActorContext(actor);
  const baseFilter = { _id: id, companyId: actor.companyId };

  if (scopedActor.role === 'MANAGER') {
    baseFilter.reportingManagerId = scopedActor.employeeRefId;
  }

  if (scopedActor.role === 'EMPLOYEE') {
    baseFilter.userId = actor.userId;
  }

  const employee = await Employee.findOne(baseFilter)
    .select('-__v')
    .populate({ path: 'userId', select: 'email role isActive lastLogin createdAt updatedAt' })
    .populate({ path: 'reportingManagerId', select: 'employeeId firstName lastName designation' })
    .populate({ path: 'departmentId', select: 'name description managerId' })
    .lean();

  if (!employee) throw new ApiError(404, 'Employee not found');
  return employee;
}

function canTransitionStatus(currentStatus, nextStatus) {
  if (!nextStatus || currentStatus === nextStatus) return true;
  const allowed = statusTransitions[currentStatus] || [];
  return allowed.includes(nextStatus);
}

async function updateEmployee(id, data, actor) {
  if (!['SUPER_ADMIN', 'HR_ADMIN'].includes(actor.role)) {
    throw new ApiError(403, 'Only SUPER_ADMIN or HR_ADMIN can update employees');
  }

  if (data.employeeId || data.companyId || data.userId) {
    throw new ApiError(400, 'employeeId, companyId, and userId cannot be changed');
  }

  const persistUpdate = async (session = null) => {
    const employeeQuery = Employee.findOne({ _id: id, companyId: actor.companyId });
    if (session) employeeQuery.session(session);
    const employee = await employeeQuery;
    if (!employee) throw new ApiError(404, 'Employee not found');

    if (data.departmentId) {
      await ensureDepartment(actor.companyId, data.departmentId, session);
    }

    if (data.reportingManagerId) {
      await ensureValidReportingManager(actor.companyId, data.reportingManagerId, employee._id, session);
    }

    if (data.status && !canTransitionStatus(employee.status, data.status)) {
      throw new ApiError(400, `Invalid status transition from ${employee.status} to ${data.status}`);
    }

    if (data.userRole) {
      if (actor.role !== 'HR_ADMIN') {
        throw new ApiError(403, 'Only HR_ADMIN can change user role');
      }
      const roleUpdateOpts = session ? { session } : {};
      await User.updateOne(
        { _id: employee.userId, companyId: actor.companyId },
        { role: data.userRole },
        roleUpdateOpts
      );
    }

    const payload = { ...data };
    delete payload.userRole;

    const updateOpts = { new: true, runValidators: true };
    if (session) updateOpts.session = session;
    return Employee.findOneAndUpdate({ _id: id, companyId: actor.companyId }, payload, updateOpts).lean();
  };

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const updated = await persistUpdate(session);
    await session.commitTransaction();
    return updated;
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch (_) {
      // no-op
    }

    if (isTransactionUnsupported(error)) {
      logger.warn('Mongo transaction not supported in current topology, retrying employee update without transaction');
      return persistUpdate(null);
    }

    throw error;
  } finally {
    await session.endSession();
  }
}

async function deleteEmployee(id, actor) {
  if (!['SUPER_ADMIN', 'HR_ADMIN'].includes(actor.role)) {
    throw new ApiError(403, 'Only SUPER_ADMIN or HR_ADMIN can delete employees');
  }

  const employee = await Employee.findOneAndUpdate(
    { _id: id, companyId: actor.companyId },
    { status: 'TERMINATED' },
    { new: true }
  ).lean();

  if (!employee) throw new ApiError(404, 'Employee not found');
  return employee;
}

module.exports = {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
};
