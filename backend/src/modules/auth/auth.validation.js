const { z } = require('zod');
const { USER_ROLES } = require('./auth.model');

const registerSchema = z.object({
  companyId: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(USER_ROLES),
  isActive: z.boolean().optional(),
});

const loginSchema = z.object({
  companyId: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

module.exports = { registerSchema, loginSchema, refreshSchema };
