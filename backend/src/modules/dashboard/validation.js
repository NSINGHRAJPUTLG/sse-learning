const { z } = require('zod');

const summaryQuerySchema = z.object({
  month: z.coerce.number().min(1).max(12).optional(),
  year: z.coerce.number().min(2000).optional(),
});

module.exports = { summaryQuerySchema };
