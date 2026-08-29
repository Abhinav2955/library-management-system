'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('book_copies', 'reserved_for_user_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    });

    await queryInterface.createTable('reservations', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      book_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'books', key: 'id' },
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      copy_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'book_copies', key: 'id' },
        onDelete: 'SET NULL',
      },
      requested_at: { type: Sequelize.DATE, allowNull: false },
      ready_at: { type: Sequelize.DATE, allowNull: true },
      expires_at: { type: Sequelize.DATE, allowNull: true },
      status: {
        type: Sequelize.ENUM('waiting', 'ready', 'fulfilled', 'cancelled', 'expired'),
        allowNull: false,
        defaultValue: 'waiting',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('reservations', ['book_id', 'status', 'requested_at']);
    await queryInterface.addIndex('reservations', ['user_id', 'status']);
    await queryInterface.addIndex('reservations', ['status', 'expires_at']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('reservations');
    await queryInterface.removeColumn('book_copies', 'reserved_for_user_id');
  },
};