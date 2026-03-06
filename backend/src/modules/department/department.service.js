const mongoose = require('mongoose');
const ApiError = require('../../utils/ApiError');
const Department = require('./department.model');
const { Employee } = require('../employee/employee.model');
const { getPagination, getSort } = require('../../utils/pagination');

function normalizeName(name) {
  return String(name || '')
    .replace(/[<>]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function ensureWriteAccess(actor) {
  if (!['SUPER_ADMIN', 'HR_ADMIN'].includes(actor.role)) {
    throw new ApiError(403, 'Only SUPER_ADMIN or HR_ADMIN can modify departments');
  }
} 

async function getActorEmployee(actor) {
  if (actor.role !== 'EMPLOYEE') return null;
  return Employee.findOne({ companyId: actor.companyId, userId: actor.userId }).select('departmentId').lean();
}

async function validateManager(companyId, managerId, session) {
  if (!managerId) return;
  if (!mongoose.isValidObjectId(managerId)) throw new ApiError(400, 'Invalid managerId');

  const manager = await Employee.findOne({ _id: managerId, companyId }).session(session || null).lean();
  if (!manager) throw new ApiError(400, 'Manager must belong to same company');
}

async function validateParentHierarchy(companyId, parentDepartmentId, selfDepartmentId, session) {
  if (!parentDepartmentId) return;
  if (!mongoose.isValidObjectId(parentDepartmentId)) throw new ApiError(400, 'Invalid parentDepartmentId');

  if (selfDepartmentId && String(parentDepartmentId) === String(selfDepartmentId)) {
    throw new ApiError(400, 'Department cannot be parent of itself');
  }

  const parent = await Department.findOne({ _id: parentDepartmentId, companyId })
    .select('_id parentDepartmentId')
    .session(session || null)
    .lean();

  if (!parent) throw new ApiError(400, 'Parent department not found in company');

  const visited = new Set(selfDepartmentId ? [String(selfDepartmentId)] : []);
  let current = parent;

  while (current) {
    const currentId = String(current._id);
    if (visited.has(currentId)) {
      throw new ApiError(400, 'Circular department hierarchy detected');
    }

    visited.add(currentId);

    if (!current.parentDepartmentId) break;

    current = await Department.findOne({
      _id: current.parentDepartmentId,
      companyId,
    })
      .select('_id parentDepartmentId')
      .session(session || null)
      .lean();

    if (!current) break;
  }
}

async function ensureUniqueName(companyId, name, excludeId = null, session) {
  const filter = { companyId, name };
  if (excludeId) filter._id = { $ne: excludeId };
  const exists = await Department.findOne(filter).session(session || null).lean();
  if (exists) throw new ApiError(409, 'Department name already exists in company');
}

function buildTree(list) {
  const map = new Map();
  const roots = [];

  for (const dept of list) {
    map.set(String(dept._id), { ...dept, children: [] });
  }

  for (const dept of map.values()) {
    const parentId = dept.parentDepartmentId ? String(dept.parentDepartmentId) : null;
    if (!parentId || !map.has(parentId)) {
      roots.push(dept);
      continue;
    }

    map.get(parentId).children.push(dept);
  }

  return roots;
}

async function createDepartment(data, actor) {
  ensureWriteAccess(actor);

  const companyId = actor.companyId;
  const payload = {
    ...data,
    name: normalizeName(data.name),
    companyId,
  };

  if (!payload.name) throw new ApiError(400, 'Department name is required');

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    await ensureUniqueName(companyId, payload.name, null, session);
    await validateManager(companyId, payload.managerId, session);
    await validateParentHierarchy(companyId, payload.parentDepartmentId, null, session);

    const created = await Department.create([payload], { session });
    await session.commitTransaction();
    return created[0].toObject();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

async function getDepartments(queryParams, actor) {
  const { page, limit, skip } = getPagination(queryParams);
  const sort = getSort(queryParams.sortBy, queryParams.order);

  const filters = { companyId: actor.companyId };

  if (queryParams.parentDepartmentId) {
    filters.parentDepartmentId = queryParams.parentDepartmentId;
  }

  if (queryParams.isActive !== undefined) {
    filters.isActive = queryParams.isActive === 'true';
  }

  if (queryParams.search) {
    filters.name = { $regex: String(queryParams.search), $options: 'i' };
  }

  if (actor.role === 'EMPLOYEE') {
    const self = await getActorEmployee(actor);
    if (!self || !self.departmentId) {
      return { items: [], pagination: { page, limit, total: 0, totalPages: 1 } };
    }
    filters._id = self.departmentId; 
  }

  const [items, total] = await Promise.all([
    Department.find(filters)
      .select('_id name description managerId parentDepartmentId isActive createdAt updatedAt')
      .populate({ path: 'managerId', select: 'employeeId firstName lastName designation' })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Department.countDocuments(filters),
  ]);

  const response = {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };

  if (queryParams.tree === 'true') {
    const allForTree = await Department.find({ companyId: actor.companyId, ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}) })
      .select('_id name description managerId parentDepartmentId isActive')
      .lean();
    response.tree = buildTree(allForTree);
  }

  return response;
}

async function getDepartmentById(id, actor) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid department id');

  const filter = { _id: id, companyId: actor.companyId };

  if (actor.role === 'EMPLOYEE') {
    const self = await getActorEmployee(actor);
    if (!self || String(self.departmentId) !== String(id)) {
      throw new ApiError(403, 'You can only view your own department');
    }
  }

  const department = await Department.findOne(filter)
    .select('_id name description managerId parentDepartmentId isActive createdAt updatedAt')
    .populate({ path: 'managerId', select: 'employeeId firstName lastName designation' })
    .populate({ path: 'parentDepartmentId', select: 'name isActive' })
    .lean();

  if (!department) throw new ApiError(404, 'Department not found');
  return department;
}

async function updateDepartment(id, data, actor) {
  ensureWriteAccess(actor);
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid department id');

  if (Object.prototype.hasOwnProperty.call(data, 'companyId')) {
    throw new ApiError(400, 'companyId cannot be changed');
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const department = await Department.findOne({ _id: id, companyId: actor.companyId }).session(session);
    if (!department) throw new ApiError(404, 'Department not found');

    const payload = { ...data };

    if (payload.name !== undefined) {
      payload.name = normalizeName(payload.name);
      if (!payload.name) throw new ApiError(400, 'Department name is required');
      await ensureUniqueName(actor.companyId, payload.name, id, session);
    }

    if (payload.parentDepartmentId !== undefined) {
      await validateParentHierarchy(actor.companyId, payload.parentDepartmentId, id, session);
    }

    if (payload.managerId !== undefined) {
      await validateManager(actor.companyId, payload.managerId, session);
    }

    const updated = await Department.findOneAndUpdate(
      { _id: id, companyId: actor.companyId },
      payload,
      { new: true, runValidators: true, session }
    )
      .select('_id name description managerId parentDepartmentId isActive createdAt updatedAt')
      .lean();

    await session.commitTransaction();
    return updated;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

async function deleteDepartment(id, actor) {
  ensureWriteAccess(actor);
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid department id');

  const [department, employeesCount, childCount] = await Promise.all([
    Department.findOne({ _id: id, companyId: actor.companyId }),
    Employee.countDocuments({ companyId: actor.companyId, departmentId: id }),
    Department.countDocuments({ companyId: actor.companyId, parentDepartmentId: id }),
  ]);

  if (!department) throw new ApiError(404, 'Department not found');
  if (employeesCount > 0) throw new ApiError(409, 'Cannot deactivate department with assigned employees');
  if (childCount > 0) throw new ApiError(409, 'Cannot deactivate department with active child departments');

  department.isActive = false;
  await department.save();

  return department.toObject();
}

async function getDepartmentStats(id, actor) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid department id');

  const dept = await Department.findOne({ _id: id, companyId: actor.companyId }).lean();
  if (!dept) throw new ApiError(404, 'Department not found');

  if (actor.role === 'EMPLOYEE') {
    const self = await getActorEmployee(actor);
    if (!self || String(self.departmentId) !== String(id)) {
      throw new ApiError(403, 'You can only view your own department stats');
    }
  }

  const [stats] = await Employee.aggregate([
    {
      $match: {
        companyId: actor.companyId,
        departmentId: new mongoose.Types.ObjectId(id),
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $addFields: {
        user: { $arrayElemAt: ['$user', 0] },
      },
    },
    {
      $group: {
        _id: null,
        totalEmployees: { $sum: 1 },
        activeEmployees: {
          $sum: {
            $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0],
          },
        },
        managersCount: {
          $sum: {
            $cond: [{ $eq: ['$user.role', 'MANAGER'] }, 1, 0],
          },
        },
      },
    },
  ]);

  return {
    totalEmployees: stats?.totalEmployees || 0,
    activeEmployees: stats?.activeEmployees || 0,
    managersCount: stats?.managersCount || 0,
  };
}

module.exports = {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  getDepartmentStats,
};
