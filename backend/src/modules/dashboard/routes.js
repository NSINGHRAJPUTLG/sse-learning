const router = require('express').Router();
const controller = require('./controller');
const auth = require('../../middleware/authMiddleware');
const validate = require('../../middleware/validate');
const { summaryQuerySchema } = require('./validation');

router.use(auth);
router.get('/summary', validate(summaryQuerySchema, 'query'), controller.summary);

module.exports = router;
