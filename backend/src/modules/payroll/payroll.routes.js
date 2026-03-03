const router = require('express').Router();
const authMiddleware = require('../../middleware/auth.middleware');
const roleMiddleware = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate');
const controller = require('./payroll.controller');
const {
  salaryStructureSchema,
  generatePayrollSchema,
  payrollIdParamSchema,
  payrollListQuerySchema,
} = require('./payroll.validation');

router.use(authMiddleware);

router.post('/salary-structures', roleMiddleware(['HR_ADMIN', 'SUPER_ADMIN']), validate(salaryStructureSchema), controller.upsertSalaryStructure);
router.post('/generate', roleMiddleware(['HR_ADMIN', 'SUPER_ADMIN']), validate(generatePayrollSchema), controller.generatePayroll);
router.put('/:id/lock', roleMiddleware(['HR_ADMIN', 'SUPER_ADMIN']), validate(payrollIdParamSchema, 'params'), controller.lockPayroll);
router.put('/:id/pay', roleMiddleware(['HR_ADMIN', 'SUPER_ADMIN']), validate(payrollIdParamSchema, 'params'), controller.markAsPaid);
router.get('/', validate(payrollListQuerySchema, 'query'), controller.listPayroll);
router.get('/:id', validate(payrollIdParamSchema, 'params'), controller.getPayrollById);
router.post('/:id/payslip', validate(payrollIdParamSchema, 'params'), controller.generatePayslip);

module.exports = router;
