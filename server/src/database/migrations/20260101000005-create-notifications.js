'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('notifications', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('due_soon', 'overdue', 'reservation_ready', 'fine_issued'),
        allowNull: false,
      },
      message: { type: Sequelize.STRING(500), allowNull: false },
      borrow_record_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'borrow_records', key: 'id' },
        onDelete: 'SET NULL',
      },
      read_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('notifications', ['user_id', 'read_at']);
    await queryInterface.addIndex('notifications', ['type', 'borrow_record_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('notifications');
  },
};