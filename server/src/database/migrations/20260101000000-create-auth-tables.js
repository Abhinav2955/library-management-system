'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      name: { type: Sequelize.STRING(120), allowNull: false },
      email: { type: Sequelize.STRING(160), allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      role: { type: Sequelize.ENUM('member', 'librarian', 'admin'), defaultValue: 'member' },
      phone: { type: Sequelize.STRING(20), allowNull: true },
      membership_status: {
        type: Sequelize.ENUM('active', 'suspended', 'expired'),
        defaultValue: 'active',
      },
      is_email_verified: { type: Sequelize.BOOLEAN, defaultValue: false },
      failed_login_attempts: { type: Sequelize.INTEGER, defaultValue: 0 },
      locked_until: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('refresh_tokens', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      token_hash: { type: Sequelize.STRING(255), allowNull: false },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      replaced_by_token_id: { type: Sequelize.UUID, allowNull: true },
      user_agent: { type: Sequelize.STRING(255), allowNull: true },
      ip_address: { type: Sequelize.STRING(64), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('refresh_tokens', ['user_id']);
    await queryInterface.addIndex('refresh_tokens', ['token_hash']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('refresh_tokens');
    await queryInterface.dropTable('users');
  },
};
