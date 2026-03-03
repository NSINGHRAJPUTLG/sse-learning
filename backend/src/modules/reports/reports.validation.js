const { z } = require('zod');

const positiveYear = z.coerce.number().int().min(2000).max(9999);
const monthSchema = z.coerce.number().int().min(1).max(12);

const employeeStatsQuerySchema = z.object({
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});

const attendanceSummaryQuerySchema = z.object({
  month: monthSchema.optional(),
  year: positiveYear.optional(),
});

const leaveSummaryQuerySchema = z.object({
  year: positiveYear.optional(),
});

const payrollSummaryQuerySchema = z.object({
  year: positiveYear.optional(),
});

const attritionQuerySchema = z.object({
  year: positiveYear.optional(),
});

const dashboardQuerySchema = z.object({
  month: monthSchema.optional(),
  year: positiveYear.optional(),
});

module.exports = {
  employeeStatsQuerySchema,
  attendanceSummaryQuerySchema,
  leaveSummaryQuerySchema,
  payrollSummaryQuerySchema,
  attritionQuerySchema,
  dashboardQuerySchema,
};
