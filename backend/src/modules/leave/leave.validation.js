const { z } = require('zod');
const { LEAVE_STATUSES } = require('./leave.model');

const objectIdRegex = /^[a-f\d]{24}$/i;

const applyLeaveSchema = z.object({
  leaveTypeId: z.string().regex(objectIdRegex),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().max(500).optional(),
});

const idParamSchema = z.object({ id: z.string().regex(objectIdRegex) });

const createLeaveTypeSchema = z.object({
  name: z.string().min(1).max(100),
  yearlyQuota: z.number().min(0),
  carryForwardAllowed: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
});

const leaveListQuerySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  employeeId: z.string().regex(objectIdRegex).optional(),
  status: z.enum(LEAVE_STATUSES).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sortBy: z.enum(['createdAt', 'startDate', 'endDate', 'status']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

const leaveSummaryQuerySchema = z.object({
  employeeId: z.string().regex(objectIdRegex).optional(),
  year: z.coerce.number().min(2000).optional(),
});

const leaveCalendarQuerySchema = z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2000),
});

module.exports = {
  applyLeaveSchema,
  idParamSchema,
  createLeaveTypeSchema,
  leaveListQuerySchema,
  leaveSummaryQuerySchema,
  leaveCalendarQuerySchema,
};
