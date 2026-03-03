const router = require('express').Router();
const controller = require('./controller');
const validate = require('../../middleware/validate');
const auth = require('../../middleware/authMiddleware');
const role = require('../../middleware/roleMiddleware');
const { createUserSchema, updateUserSchema } = require('./validation');

router.use(auth);
router.get('/', role(['SUPER_ADMIN', 'HR_ADMIN']), controller.list);
router.get('/:id', role(['SUPER_ADMIN', 'HR_ADMIN']), controller.getById);
router.post('/', role(['SUPER_ADMIN', 'HR_ADMIN']), validate(createUserSchema), controller.create);
router.put('/:id', role(['SUPER_ADMIN', 'HR_ADMIN']), validate(updateUserSchema), controller.update);
router.delete('/:id', role(['SUPER_ADMIN']), controller.remove);

module.exports = router;
