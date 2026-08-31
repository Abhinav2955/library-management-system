const express = require('express');
const controller = require('./fine.controller');
const validate = require('../../middlewares/validate.middleware');
const authenticate = require('../../middlewares/auth.middleware');
const authorize = require('../../middlewares/rbac.middleware');
const { idParamSchema, verifyPaymentSchema, waiveFineSchema, listFinesSchema } = require('./fine.validation');

const router = express.Router();

router.use(authenticate);

router.get('/me', controller.myFines);
router.post('/:id/create-order', validate(idParamSchema), controller.createPaymentOrder);
router.post('/:id/verify-payment', validate(verifyPaymentSchema), controller.verifyPayment);

router.get('/', authorize('admin', 'librarian'), validate(listFinesSchema), controller.allFines);
router.post('/:id/pay', authorize('admin', 'librarian'), validate(idParamSchema), controller.recordManualPayment);
router.post('/:id/waive', authorize('admin', 'librarian'), validate(waiveFineSchema), controller.waive);

module.exports = router;