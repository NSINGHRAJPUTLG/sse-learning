const router = require('express').Router();
const validate = require('../../middleware/validate');
const authMiddleware = require('../../middleware/auth.middleware');
const roleMiddleware = require('../../middleware/role.middleware');
const controller = require('./department.controller');
const { createDepartmentSchema, updateDepartmentSchema, idParamSchema } = require('./department.validation');

router.use(authMiddleware);

router.post('/', roleMiddleware(['SUPER_ADMIN', 'HR_ADMIN']), validate(createDepartmentSchema), controller.createDepartment);
router.get('/', controller.getDepartments);
router.get('/:id', validate(idParamSchema, 'params'), controller.getDepartmentById);
router.put('/:id', roleMiddleware(['SUPER_ADMIN', 'HR_ADMIN']), validate(idParamSchema, 'params'), validate(updateDepartmentSchema), controller.updateDepartment);
router.delete('/:id', roleMiddleware(['SUPER_ADMIN', 'HR_ADMIN']), validate(idParamSchema, 'params'), controller.deleteDepartment);
router.get('/:id/stats', validate(idParamSchema, 'params'), controller.getDepartmentStats);

module.exports = router;
 