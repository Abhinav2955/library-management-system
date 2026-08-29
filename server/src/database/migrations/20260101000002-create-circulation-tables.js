'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('book_copies', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      book_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'books', key: 'id' },
        onDelete: 'CASCADE',
      },
      barcode: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      shelf_location: { type: Sequelize.STRING(50), allowNull: true },
      status: {
        type: Sequelize.ENUM('available', 'borrowed', 'reserved', 'lost', 'damaged', 'under_repair'),
        allowNull: false,
        defaultValue: 'available',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('book_copies', ['book_id', 'status']);

    await queryInterface.createTable('borrow_records', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      copy_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'book_copies', key: 'id' },
        onDelete: 'RESTRICT',
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
      },
      borrowed_at: { type: Sequelize.DATE, allowNull: false },
      due_at: { type: Sequelize.DATE, allowNull: false },
      returned_at: { type: Sequelize.DATE, allowNull: true },
      renewed_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      status: {
        type: Sequelize.ENUM('active', 'returned', 'overdue', 'lost'),
        allowNull: false,
        defaultValue: 'active',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('borrow_records', ['user_id', 'status']);
    await queryInterface.addIndex('borrow_records', ['due_at']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('borrow_records');
    await queryInterface.dropTable('book_copies');
  },
};