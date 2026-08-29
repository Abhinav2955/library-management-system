const { Op, literal } = require('sequelize');
const { Book, Author, Category, sequelize } = require('../../database/models');
const ApiError = require('../../utils/ApiError');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination');

const includeRelations = [
  { model: Author, as: 'authors', through: { attributes: [] }, attributes: ['id', 'name'] },
  { model: Category, as: 'categories', through: { attributes: [] }, attributes: ['id', 'name'] },
];

const createBook = async (data) => {
  const existing = await Book.findOne({ where: { isbn: data.isbn } });
  if (existing) {
    throw ApiError.conflict('A book with this ISBN already exists');
  }

  return sequelize.transaction(async (t) => {
    const book = await Book.create(
      {
        isbn: data.isbn,
        title: data.title,
        description: data.description,
        publisher: data.publisher,
        publishedYear: data.publishedYear,
        language: data.language,
        coverUrl: data.coverUrl,
        totalCopies: data.totalCopies,
        availableCopies: data.totalCopies,
      },
      { transaction: t }
    );

    if (data.authorIds?.length) await book.setAuthors(data.authorIds, { transaction: t });
    if (data.categoryIds?.length) await book.setCategories(data.categoryIds, { transaction: t });

    return getBookById(book.id);
  });
};

const getBookById = async (id) => {
  const book = await Book.findByPk(id, { include: includeRelations });
  if (!book) throw ApiError.notFound('Book not found');
  return book;
};

const listBooks = async (query) => {
  const { page, limit, offset } = parsePagination(query);
  const { search, categoryId, authorId, language, availableOnly, sortBy, sortOrder } = query;

  const where = {};
  if (language) where.language = language;
  if (availableOnly) where.availableCopies = { [Op.gt]: 0 };

  if (search && search.trim().length >= 3) {
    where[Op.and] = where[Op.and] || [];
    where[Op.and].push(
      literal(`MATCH(title, description) AGAINST(:search IN NATURAL LANGUAGE MODE)`)
    );
  } else if (search) {
    where[Op.or] = [{ title: { [Op.like]: `%${search}%` } }, { isbn: { [Op.like]: `%${search}%` } }];
  }

  const include = [...includeRelations];
  if (categoryId) {
    include[1] = { ...include[1], where: { id: categoryId }, required: true };
  }
  if (authorId) {
    include[0] = { ...include[0], where: { id: authorId }, required: true };
  }

  const { rows, count } = await Book.findAndCountAll({
    where,
    include,
    limit,
    offset,
    distinct: true,
    order: [[sortBy, sortOrder.toUpperCase()]],
    replacements: { search },
    subQuery: false,
  });

  return { books: rows, meta: buildPaginationMeta({ page, limit, total: count }) };
};

const updateBook = async (id, data) => {
  const book = await Book.findByPk(id);
  if (!book) throw ApiError.notFound('Book not found');

  if (data.isbn && data.isbn !== book.isbn) {
    const clash = await Book.findOne({ where: { isbn: data.isbn } });
    if (clash) throw ApiError.conflict('Another book already uses this ISBN');
  }

  return sequelize.transaction(async (t) => {
    await book.update(data, { transaction: t });
    if (data.authorIds) await book.setAuthors(data.authorIds, { transaction: t });
    if (data.categoryIds) await book.setCategories(data.categoryIds, { transaction: t });
    return getBookById(book.id);
  });
};

const deleteBook = async (id) => {
  const book = await Book.findByPk(id);
  if (!book) throw ApiError.notFound('Book not found');
  await book.destroy();
};

module.exports = { createBook, getBookById, listBooks, updateBook, deleteBook };