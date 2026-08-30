const express = require('express');
const controller = require('./notification.controller');
const validate = require('../../middlewares/validate.middleware');
const authenticate = require('../../middlewares/auth.middleware');
const { idParamSchema, listNotificationsSchema } = require('./notification.validation');

const router = express.Router();

router.use(authenticate);

router.get('/me', validate(listNotificationsSchema), controller.myNotifications);
router.post('/:id/read', validate(idParamSchema), controller.markRead);
router.post('/read-all', controller.markAllRead);

module.exports = router;