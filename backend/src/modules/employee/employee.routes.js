const router = require('express').Router();
const validate = require('../../middleware/validate');
const authMiddleware = require('../../middleware/auth.middleware');
const roleMiddleware = require('../../middleware/role.middleware');
const employeeController = require('./employee.controller');
const { createEmployeeSchema, updateEmployeeSchema } = require('./employee.validation');

router.use(authMiddleware);

router.post('/', roleMiddleware(['SUPER_ADMIN', 'HR_ADMIN']), validate(createEmployeeSchema), employeeController.createEmployee);
router.get('/', employeeController.getEmployees);
router.get('/:id', employeeController.getEmployeeById);
router.put('/:id', roleMiddleware(['SUPER_ADMIN', 'HR_ADMIN']), validate(updateEmployeeSchema), employeeController.updateEmployee);
router.delete('/:id', roleMiddleware(['SUPER_ADMIN', 'HR_ADMIN']), employeeController.deleteEmployee);

module.exports = router;
