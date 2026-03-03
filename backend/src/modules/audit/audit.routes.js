const router = require('express').Router();
const { z } = require('zod');
const authMiddleware = require('../../middleware/auth.middleware');
const roleMiddleware = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate');
const controller = require('./audit.controller');

const querySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  userId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  module: z.string().min(2).optional(),
  action: z.string().min(2).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

router.use(authMiddleware);

router.get('/', roleMiddleware(['HR_ADMIN', 'SUPER_ADMIN']), validate(querySchema, 'query'), controller.getAuditLogs);
router.get('/my-activity', validate(querySchema, 'query'), controller.getMyActivity);

module.exports = router;
