const express = require('express');
const controller = require('./borrow.controller');
const validate = require('../../middlewares/validate.middleware');
const authenticate = require('../../middlewares/auth.middleware');
const authorize = require('../../middlewares/rbac.middleware');
const {
  checkoutSchema,
  addCopySchema,
  recordIdSchema,
  listBorrowRecordsSchema,
  listCopiesSchema,
} = require('./borrow.validation');

const router = express.Router();

router.use(authenticate);

router.post('/checkout', validate(checkoutSchema), controller.checkout);
router.post('/:id/return', validate(recordIdSchema), authorize('admin', 'librarian'), controller.returnBook);
router.post('/:id/renew', validate(recordIdSchema), controller.renew);
router.get('/me', controller.myLoans);

router.get('/', authorize('admin', 'librarian'), validate(listBorrowRecordsSchema), controller.allRecords);
router.post('/copies', authorize('admin', 'librarian'), validate(addCopySchema), controller.addCopies);
router.get('/copies', authorize('admin', 'librarian'), validate(listCopiesSchema), controller.listCopies);
router.post('/copies/:id/retire', authorize('admin', 'librarian'), validate(recordIdSchema), controller.retireCopy);

module.exports = router;