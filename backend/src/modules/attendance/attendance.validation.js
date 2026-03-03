const { z } = require('zod');
const { ATTENDANCE_STATUSES } = require('./attendance.model');

const objectIdRegex = /^[a-f\d]{24}$/i;

const checkInSchema = z.object({
  location: z.string().max(200).optional(),
});

const checkOutSchema = z.object({
  location: z.string().max(200).optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  employeeId: z.string().regex(objectIdRegex).optional(),
  status: z.enum(ATTENDANCE_STATUSES).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sortBy: z.enum(['createdAt', 'date', 'checkIn', 'totalHours']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

const summaryQuerySchema = z.object({
  employeeId: z.string().regex(objectIdRegex).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

module.exports = {
  checkInSchema,
  checkOutSchema,
  listQuerySchema,
  summaryQuerySchema,
};
