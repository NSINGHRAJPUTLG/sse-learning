const router = require('express').Router();
const validate = require('../../middleware/validate');
const authMiddleware = require('../../middleware/auth.middleware');
const roleMiddleware = require('../../middleware/role.middleware');
const controller = require('./leave.controller');
const {
  applyLeaveSchema,
  idParamSchema,
  createLeaveTypeSchema,
  leaveListQuerySchema,
  leaveSummaryQuerySchema,
  leaveCalendarQuerySchema,
} = require('./leave.validation');

router.use(authMiddleware);

router.post('/types', roleMiddleware(['SUPER_ADMIN', 'HR_ADMIN']), validate(createLeaveTypeSchema), controller.createLeaveType);
router.get('/types', controller.listLeaveTypes);

router.post('/apply', roleMiddleware(['EMPLOYEE']), validate(applyLeaveSchema), controller.applyLeave);
router.put('/:id/approve', roleMiddleware(['MANAGER', 'HR_ADMIN', 'SUPER_ADMIN']), validate(idParamSchema, 'params'), controller.approveLeave);
router.put('/:id/reject', roleMiddleware(['MANAGER', 'HR_ADMIN', 'SUPER_ADMIN']), validate(idParamSchema, 'params'), controller.rejectLeave);
router.put('/:id/cancel', roleMiddleware(['EMPLOYEE']), validate(idParamSchema, 'params'), controller.cancelLeave);

router.get('/summary', validate(leaveSummaryQuerySchema, 'query'), controller.getLeaveSummary);
router.get('/calendar', validate(leaveCalendarQuerySchema, 'query'), controller.getLeaveCalendar);
router.get('/', validate(leaveListQuerySchema, 'query'), controller.getLeaveList);

module.exports = router;
