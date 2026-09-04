const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const bookService = require('./book.service');

const create = asyncHandler(async (req, res) => {
  const book = await bookService.createBook(req.body);
  return new ApiResponse(201, book, 'Book created successfully').send(res);
});

const list = asyncHandler(async (req, res) => {
  const { books, meta } = await bookService.listBooks(req.query);
  return new ApiResponse(200, { books, meta }).send(res);
});

const getOne = asyncHandler(async (req, res) => {
  const book = await bookService.getBookById(req.params.id);
  return new ApiResponse(200, book).send(res);
});

const update = asyncHandler(async (req, res) => {
  const book = await bookService.updateBook(req.params.id, req.body);
  return new ApiResponse(200, book, 'Book updated successfully').send(res);
});

const remove = asyncHandler(async (req, res) => {
  await bookService.deleteBook(req.params.id);
  return new ApiResponse(200, null, 'Book deleted successfully').send(res);
});

const recommendations = asyncHandler(async (req, res) => {
  const related = await bookService.getRelatedBooks(req.params.id, req.query.limit);
  return new ApiResponse(200, related).send(res);
});

module.exports = { create, list, getOne, update, remove, recommendations };