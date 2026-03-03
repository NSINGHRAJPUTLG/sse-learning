const { z } = require('zod');
const { PAYROLL_STATUSES } = require('./payroll.model');

const objectIdRegex = /^[a-f\d]{24}$/i;

const salaryStructureSchema = z.object({
  employeeId: z.string().regex(objectIdRegex),
  basic: z.number().min(0),
  hra: z.number().min(0).optional(),
  allowances: z.number().min(0).optional(),
  bonus: z.number().min(0).optional(),
  deductions: z.number().min(0).optional(),
  taxPercentage: z.number().min(0).max(100).optional(),
  effectiveFrom: z.coerce.date(),
});

const generatePayrollSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
});

const payrollIdParamSchema = z.object({
  id: z.string().regex(objectIdRegex),
});

const payrollListQuerySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).optional(),
  status: z.enum(PAYROLL_STATUSES).optional(),
  employeeId: z.string().regex(objectIdRegex).optional(),
  sortBy: z.enum(['createdAt', 'month', 'year', 'netSalary']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

module.exports = {
  salaryStructureSchema,
  generatePayrollSchema,
  payrollIdParamSchema,
  payrollListQuerySchema,
};
