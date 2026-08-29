const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const fineService = require('./fine.service');

const myFines = asyncHandler(async (req, res) => {
  const { fines, pendingBalance, meta } = await fineService.listMyFines(req.user.id, req.query);
  return new ApiResponse(200, { fines, pendingBalance, meta }).send(res);
});

const allFines = asyncHandler(async (req, res) => {
  const { fines, meta } = await fineService.listAllFines(req.query);
  return new ApiResponse(200, { fines, meta }).send(res);
});

const pay = asyncHandler(async (req, res) => {
  const fine = await fineService.payFine(req.params.id, req.user);
  return new ApiResponse(200, fine, 'Fine paid successfully').send(res);
});

const waive = asyncHandler(async (req, res) => {
  const fine = await fineService.waiveFine(req.params.id, req.user, req.body.reason);
  return new ApiResponse(200, fine, 'Fine waived').send(res);
});

module.exports = { myFines, allFines, pay, waive };