'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('authors', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      bio: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('categories', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      name: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      parent_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'categories', key: 'id' },
        onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('books', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      isbn: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      title: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      publisher: { type: Sequelize.STRING(150), allowNull: true },
      published_year: { type: Sequelize.INTEGER, allowNull: true },
      language: { type: Sequelize.STRING(50), allowNull: true, defaultValue: 'English' },
      cover_url: { type: Sequelize.STRING(500), allowNull: true },
      avg_rating: { type: Sequelize.DECIMAL(3, 2), allowNull: false, defaultValue: 0 },
      total_copies: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      available_copies: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('book_authors', {
      book_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'books', key: 'id' },
        onDelete: 'CASCADE',
      },
      author_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'authors', key: 'id' },
        onDelete: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addConstraint('book_authors', {
      fields: ['book_id', 'author_id'],
      type: 'primary key',
      name: 'pk_book_authors',
    });

    await queryInterface.createTable('book_categories', {
      book_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'books', key: 'id' },
        onDelete: 'CASCADE',
      },
      category_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'categories', key: 'id' },
        onDelete: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addConstraint('book_categories', {
      fields: ['book_id', 'category_id'],
      type: 'primary key',
      name: 'pk_book_categories',
    });

    await queryInterface.sequelize.query(
      'ALTER TABLE books ADD FULLTEXT INDEX ft_books_title_description (title, description)'
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('book_categories');
    await queryInterface.dropTable('book_authors');
    await queryInterface.dropTable('books');
    await queryInterface.dropTable('categories');
    await queryInterface.dropTable('authors');
  },
};