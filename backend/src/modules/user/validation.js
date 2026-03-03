const { z } = require('zod');

const createUserSchema = z.object({
  companyId: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE']).optional(),
  isActive: z.boolean().optional(),
});

const updateUserSchema = createUserSchema.partial().omit({ companyId: true });

module.exports = { createUserSchema, updateUserSchema };
