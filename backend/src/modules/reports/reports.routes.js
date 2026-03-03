const router = require('express').Router();
const authMiddleware = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate');
const controller = require('./reports.controller');
const {
  employeeStatsQuerySchema,
  attendanceSummaryQuerySchema,
  leaveSummaryQuerySchema,
  payrollSummaryQuerySchema,
  attritionQuerySchema,
  dashboardQuerySchema,
} = require('./reports.validation');

router.use(authMiddleware);

router.get('/employee-stats', validate(employeeStatsQuerySchema, 'query'), controller.employeeStats);
router.get('/attendance-summary', validate(attendanceSummaryQuerySchema, 'query'), controller.attendanceSummary);
router.get('/leave-summary', validate(leaveSummaryQuerySchema, 'query'), controller.leaveSummary);
router.get('/payroll-summary', validate(payrollSummaryQuerySchema, 'query'), controller.payrollSummary);
router.get('/attrition', validate(attritionQuerySchema, 'query'), controller.attrition);
router.get('/dashboard', validate(dashboardQuerySchema, 'query'), controller.dashboard);

module.exports = router;
