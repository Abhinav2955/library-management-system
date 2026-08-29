const express = require('express');
const controller = require('./reservation.controller');
const validate = require('../../middlewares/validate.middleware');
const authenticate = require('../../middlewares/auth.middleware');
const authorize = require('../../middlewares/rbac.middleware');
const {
  createReservationSchema,
  idParamSchema,
  listReservationsSchema,
} = require('./reservation.validation');

const router = express.Router();

router.use(authenticate);

router.post('/', validate(createReservationSchema), controller.create);
router.post('/:id/cancel', validate(idParamSchema), controller.cancel);
router.get('/me', controller.myReservations);
router.get('/', authorize('admin', 'librarian'), validate(listReservationsSchema), controller.allReservations);

module.exports = router;