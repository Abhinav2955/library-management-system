'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('reservations', 'requested_at', {
      type: Sequelize.DATE(3),
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('reservations', 'requested_at', {
      type: Sequelize.DATE,
      allowNull: false,
    });
  },
};