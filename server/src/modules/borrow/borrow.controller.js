const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const borrowService = require('./borrow.service');

const addCopies = asyncHandler(async (req, res) => {
  const copies = await borrowService.addCopies(req.body);
  return new ApiResponse(201, copies, `${copies.length} copy(ies) added`).send(res);
});

const checkout = asyncHandler(async (req, res) => {
  const record = await borrowService.checkout(req.user, req.body);
  return new ApiResponse(201, record, 'Book checked out successfully').send(res);
});

const returnBook = asyncHandler(async (req, res) => {
  const { record, wasOverdue } = await borrowService.returnBook(req.params.id);
  const message = wasOverdue
    ? 'Book returned — a fine was applied for the overdue period'
    : 'Book returned successfully';
  return new ApiResponse(200, record, message).send(res);
});

const renew = asyncHandler(async (req, res) => {
  const record = await borrowService.renew(req.params.id, req.user);
  return new ApiResponse(200, record, 'Loan renewed successfully').send(res);
});

const myLoans = asyncHandler(async (req, res) => {
  const { records, meta } = await borrowService.listMyLoans(req.user.id, req.query);
  return new ApiResponse(200, { records, meta }).send(res);
});

const allRecords = asyncHandler(async (req, res) => {
  const { records, meta } = await borrowService.listAllRecords(req.query);
  return new ApiResponse(200, { records, meta }).send(res);
});
const listCopies = asyncHandler(async (req, res) => {
  const copies = await borrowService.listCopiesForBook(req.query.bookId);
  return new ApiResponse(200, copies).send(res);
});

const retireCopy = asyncHandler(async (req, res) => {
  const copy = await borrowService.retireCopy(req.params.id);
  return new ApiResponse(200, copy, 'Copy retired').send(res);
});
module.exports = {
  addCopies,
  listCopies,
  retireCopy,
  checkout,
  returnBook,
  renew,
  myLoans,
  allRecords,
};