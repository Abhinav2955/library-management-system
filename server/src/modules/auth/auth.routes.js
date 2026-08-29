const express = require('express');
const controller = require('./auth.controller');
const validate = require('../../middlewares/validate.middleware');
const authenticate = require('../../middlewares/auth.middleware');
const { authLimiter } = require('../../middlewares/rateLimiter.middleware');
const { registerSchema, loginSchema, changePasswordSchema } = require('./auth.validation');

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), controller.register);
router.post('/login', authLimiter, validate(loginSchema), controller.login);
router.post('/refresh', authLimiter, controller.refresh);
router.post('/logout', controller.logout);

router.get('/me', authenticate, controller.me);
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  controller.changePassword
);

module.exports = router;
