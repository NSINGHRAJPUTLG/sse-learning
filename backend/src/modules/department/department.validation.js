const { z } = require('zod');

const objectIdRegex = /^[a-f\d]{24}$/i;

const createDepartmentSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(400).optional(),
  managerId: z.string().regex(objectIdRegex).optional(),
  parentDepartmentId: z.string().regex(objectIdRegex).nullable().optional(),
  isActive: z.boolean().optional(),
});

const updateDepartmentSchema = createDepartmentSchema.partial();

const idParamSchema = z.object({
  id: z.string().regex(objectIdRegex),
});

module.exports = {
  createDepartmentSchema,
  updateDepartmentSchema,
  idParamSchema,
};
