const { z } = require('zod');

const createPerformanceSchema = z.object({
  companyId: z.string().min(1),
  employeeId: z.string().min(1),
  reviewerId: z.string().min(1),
  rating: z.number().min(1).max(5),
  goals: z.string().optional(),
  feedback: z.string().optional(),
  quarter: z.string().min(2),
});

const updatePerformanceSchema = createPerformanceSchema.partial().omit({ companyId: true });

module.exports = { createPerformanceSchema, updatePerformanceSchema };
