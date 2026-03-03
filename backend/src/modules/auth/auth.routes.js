const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const controller = require('./auth.controller');
const validate = require('../../middleware/validate');
const authMiddleware = require('../../middleware/auth.middleware');
const optionalAuthMiddleware = require('../../middleware/optionalAuth.middleware');
const { registerSchema, loginSchema, refreshSchema } = require('./auth.validation');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try later', data: {} },
});

router.post('/register', optionalAuthMiddleware, validate(registerSchema), controller.register);
router.post('/login', loginLimiter, validate(loginSchema), controller.login);
router.post('/refresh', validate(refreshSchema), controller.refresh);
router.post('/logout', authMiddleware, controller.logout);
router.get('/me', authMiddleware, controller.me);

module.exports = router;
