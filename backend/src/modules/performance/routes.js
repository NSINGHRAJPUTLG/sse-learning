const router = require('express').Router();
const controller = require('./controller');
const auth = require('../../middleware/authMiddleware');
const role = require('../../middleware/roleMiddleware');
const validate = require('../../middleware/validate');
const { createPerformanceSchema, updatePerformanceSchema } = require('./validation');

router.use(auth);
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', role(['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER']), validate(createPerformanceSchema), controller.create);
router.put('/:id', role(['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER']), validate(updatePerformanceSchema), controller.update);
router.delete('/:id', role(['SUPER_ADMIN', 'HR_ADMIN']), controller.remove);

module.exports = router;
