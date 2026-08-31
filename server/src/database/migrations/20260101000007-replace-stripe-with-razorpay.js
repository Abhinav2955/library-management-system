'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('fines');
    if (table.stripe_payment_intent_id) {
      await queryInterface.removeColumn('fines', 'stripe_payment_intent_id');
    }

    await queryInterface.addColumn('fines', 'razorpay_order_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn('fines', 'razorpay_payment_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addIndex('fines', ['razorpay_order_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('fines', 'razorpay_order_id');
    await queryInterface.removeColumn('fines', 'razorpay_payment_id');
    await queryInterface.addColumn('fines', 'stripe_payment_intent_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },
};