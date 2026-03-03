const router = require('express').Router();

router.use('/auth', require('../modules/auth/auth.routes'));
router.use('/users', require('../modules/user/routes'));
router.use('/employees', require('../modules/employee/employee.routes'));
router.use('/departments', require('../modules/department/department.routes'));
router.use('/attendance', require('../modules/attendance/attendance.routes'));
router.use('/leaves', require('../modules/leave/leave.routes'));
router.use('/payroll', require('../modules/payroll/payroll.routes'));
router.use('/performance', require('../modules/performance/routes'));
router.use('/recruitment', require('../modules/recruitment/routes'));
router.use('/assets', require('../modules/assets/routes'));
router.use('/notifications', require('../modules/notifications/notification.routes'));
router.use('/dashboard', require('../modules/dashboard/routes'));
router.use('/reports', require('../modules/reports/reports.routes'));
router.use('/audit', require('../modules/audit/audit.routes'));

module.exports = router;
