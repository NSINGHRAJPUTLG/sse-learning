const router = require('express').Router();
const authMiddleware = require('../../middleware/auth.middleware');
const roleMiddleware = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate');
const controller = require('./attendance.controller');
const { checkInSchema, checkOutSchema, listQuerySchema, summaryQuerySchema } = require('./attendance.validation');

router.use(authMiddleware);

router.post('/check-in', roleMiddleware(['EMPLOYEE']), validate(checkInSchema), controller.checkIn);
router.post('/check-out', roleMiddleware(['EMPLOYEE']), validate(checkOutSchema), controller.checkOut);
router.get('/summary', validate(summaryQuerySchema, 'query'), controller.summary);
router.get('/', validate(listQuerySchema, 'query'), controller.list);

module.exports = router;
