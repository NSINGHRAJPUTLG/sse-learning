const mongoose = require('mongoose');
const AuditLog = require('./audit.model');
const ApiError = require('../../utils/ApiError');
const { getPagination } = require('../../utils/pagination');

const ENTITY_TYPES = [
  'USER',
  'EMPLOYEE',
  'LEAVE',
  'PAYROLL',
  'ATTENDANCE',
  'AUTH',
  'DEPARTMENT',
  'NOTIFICATION',
  'REPORT',
  'SYSTEM',
];

function sanitize(data) {
  if (data == null) return data;
  if (Array.isArray(data)) return data.map(sanitize);
  if (typeof data !== 'object') return data;

  const out = {};
  for (const [k, v] of Object.entries(data)) {
    const key = k.toLowerCase();
    if (['password', 'token', 'refreshtoken', 'authorization'].includes(key)) continue;
    out[k] = sanitize(v);
  }
  return out;
}

async function logAction(payload) {
  if (!payload || !payload.companyId || !payload.userId || !payload.action || !payload.module) {
    return null;
  }

  if (payload.entityType && !ENTITY_TYPES.includes(payload.entityType)) {
    throw new ApiError(400, 'Invalid entityType for audit log');
  }

  const doc = {
    companyId: payload.companyId,
    userId: payload.userId,
    action: String(payload.action).toUpperCase(),
    module: String(payload.module).toUpperCase(),
    entityId: payload.entityId ? String(payload.entityId) : undefined,
    entityType: payload.entityType ? String(payload.entityType).toUpperCase() : undefined,
    before: sanitize(payload.before ?? null),
    after: sanitize(payload.after ?? null),
    ipAddress: payload.ipAddress,
    userAgent: payload.userAgent,
  };

  return AuditLog.create(doc);
}

async function getAuditLogs(user, queryParams = {}) {
  const { page, limit, skip } = getPagination(queryParams);
  const safeLimit = Math.min(limit, 100);

  const filters = { companyId: user.companyId };

  if (queryParams.userId) {
    if (!mongoose.isValidObjectId(queryParams.userId)) throw new ApiError(400, 'Invalid userId');
    filters.userId = queryParams.userId;
  }

  if (queryParams.module) filters.module = String(queryParams.module).toUpperCase();
  if (queryParams.action) filters.action = String(queryParams.action).toUpperCase();

  if (queryParams.dateFrom || queryParams.dateTo) {
    filters.createdAt = {};
    if (queryParams.dateFrom) filters.createdAt.$gte = new Date(queryParams.dateFrom);
    if (queryParams.dateTo) filters.createdAt.$lte = new Date(queryParams.dateTo);
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    AuditLog.countDocuments(filters),
  ]);

  return {
    items,
    pagination: {
      page,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
}

async function getMyActivity(user, queryParams = {}) {
  return getAuditLogs(user, { ...queryParams, userId: String(user.userId) });
}

module.exports = {
  ENTITY_TYPES,
  logAction,
  getAuditLogs,
  getMyActivity,
};
