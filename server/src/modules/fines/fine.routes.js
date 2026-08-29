const express = require('express');
const controller = require('./fine.controller');
const validate = require('../../middlewares/validate.middleware');
const authenticate = require('../../middlewares/auth.middleware');
const authorize = require('../../middlewares/rbac.middleware');
const { idParamSchema, waiveFineSchema, listFinesSchema } = require('./fine.validation');

const router = express.Router();

router.use(authenticate);

router.get('/me', controller.myFines);
router.post('/:id/pay', validate(idParamSchema), controller.pay);

router.get('/', authorize('admin', 'librarian'), validate(listFinesSchema), controller.allFines);
router.post('/:id/waive', authorize('admin', 'librarian'), validate(waiveFineSchema), controller.waive);

module.exports = router;