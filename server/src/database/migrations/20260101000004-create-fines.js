'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('fines', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      borrow_record_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'borrow_records', key: 'id' },
        onDelete: 'SET NULL',
      },
      amount: { type: Sequelize.DECIMAL(8, 2), allowNull: false },
      reason: { type: Sequelize.STRING(255), allowNull: false },
      status: {
        type: Sequelize.ENUM('pending', 'paid', 'waived'),
        allowNull: false,
        defaultValue: 'pending',
      },
      paid_at: { type: Sequelize.DATE, allowNull: true },
      waived_by_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      waived_reason: { type: Sequelize.STRING(255), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('fines', ['user_id', 'status']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('fines');
  },
};