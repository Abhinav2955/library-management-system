const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/db');
const Author = require('./author.model');
const Category = require('./category.model');

class Book extends Model {}

Book.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    isbn: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    title: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    publisher: { type: DataTypes.STRING(150), allowNull: true },
    publishedYear: { type: DataTypes.INTEGER, allowNull: true, field: 'published_year' },
    language: { type: DataTypes.STRING(50), allowNull: true, defaultValue: 'English' },
    coverUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'cover_url' },
    avgRating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'avg_rating',
    },
    totalCopies: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'total_copies' },
    availableCopies: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'available_copies',
    },
  },
  {
  sequelize,
  modelName: 'Book',
  tableName: 'books',
  paranoid: true,
  // Declared here (not just in the migration) because sequelize.sync()
  // — used by every test file's beforeAll, and by the app itself in
  // development — only knows about indexes defined on the model. A
  // FULLTEXT index that exists solely as raw SQL inside a migration file
  // is invisible to sync(), so MATCH...AGAINST queries would 500 with
  // "Can't find FULLTEXT index matching the column list" in any
  // environment that builds its schema via sync() instead of migrate.
  indexes: [{ name: 'ft_books_title_description', type: 'FULLTEXT', fields: ['title', 'description'] }],
}
);

Book.belongsToMany(Author, { through: 'book_authors', as: 'authors', foreignKey: 'bookId', otherKey: 'authorId' });
Author.belongsToMany(Book, { through: 'book_authors', as: 'books', foreignKey: 'authorId', otherKey: 'bookId' });

Book.belongsToMany(Category, {
  through: 'book_categories',
  as: 'categories',
  foreignKey: 'bookId',
  otherKey: 'categoryId',
});
Category.belongsToMany(Book, {
  through: 'book_categories',
  as: 'books',
  foreignKey: 'categoryId',
  otherKey: 'bookId',
});

module.exports = Book;