const router = require('express').Router();
const { z } = require('zod');
const validate = require('../../middleware/validate');
const authMiddleware = require('../../middleware/auth.middleware');
const controller = require('./notification.controller');

const notificationIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i),
});

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  unreadOnly: z.enum(['true', 'false']).optional(),
});

router.use(authMiddleware);

router.get('/', validate(listQuerySchema, 'query'), controller.getNotifications);
router.put('/:id/read', validate(notificationIdParamSchema, 'params'), controller.markRead);
router.put('/read-all', controller.markReadAll);

module.exports = router;
