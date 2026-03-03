const { z } = require('zod');

const createRecruitmentSchema = z.object({
  companyId: z.string().min(1),
  fullName: z.string().min(1),
  email: z.string().email(),
  position: z.string().min(1),
  status: z.enum(['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED']).optional(),
  source: z.string().optional(),
});

const updateRecruitmentSchema = createRecruitmentSchema.partial().omit({ companyId: true });

module.exports = { createRecruitmentSchema, updateRecruitmentSchema };
