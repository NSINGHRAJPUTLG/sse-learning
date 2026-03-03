const router = require('express').Router();
const controller = require('./controller');
const auth = require('../../middleware/authMiddleware');
const role = require('../../middleware/roleMiddleware');
const validate = require('../../middleware/validate');
const { createRecruitmentSchema, updateRecruitmentSchema } = require('./validation');

router.use(auth);
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', role(['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER']), validate(createRecruitmentSchema), controller.create);
router.put('/:id', role(['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER']), validate(updateRecruitmentSchema), controller.update);
router.delete('/:id', role(['SUPER_ADMIN', 'HR_ADMIN']), controller.remove);

module.exports = router;
