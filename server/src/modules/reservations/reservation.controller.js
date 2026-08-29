const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const reservationService = require('./reservation.service');

const create = asyncHandler(async (req, res) => {
  const reservation = await reservationService.createReservation(req.user.id, req.body.bookId);
  return new ApiResponse(201, reservation, 'Reservation placed').send(res);
});

const cancel = asyncHandler(async (req, res) => {
  const reservation = await reservationService.cancelReservation(req.params.id, req.user);
  return new ApiResponse(200, reservation, 'Reservation cancelled').send(res);
});

const myReservations = asyncHandler(async (req, res) => {
  const { reservations, meta } = await reservationService.listMyReservations(req.user.id, req.query);
  return new ApiResponse(200, { reservations, meta }).send(res);
});

const allReservations = asyncHandler(async (req, res) => {
  const { reservations, meta } = await reservationService.listAllReservations(req.query);
  return new ApiResponse(200, { reservations, meta }).send(res);
});

module.exports = { create, cancel, myReservations, allReservations };