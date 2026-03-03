const { z } = require('zod');

const createAssetSchema = z.object({
  companyId: z.string().min(1),
  employeeId: z.string().min(1),
  assetName: z.string().min(1),
  serialNumber: z.string().min(1),
  assignedDate: z.coerce.date(),
  returnedDate: z.coerce.date().optional(),
  status: z.enum(['ASSIGNED', 'RETURNED', 'LOST', 'DAMAGED']).optional(),
});

const updateAssetSchema = createAssetSchema.partial().omit({ companyId: true });

module.exports = { createAssetSchema, updateAssetSchema };
