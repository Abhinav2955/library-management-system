const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/db');
const User = require('./user.model');
const BorrowRecord = require('./borrowRecord.model');

class Fine extends Model {}

Fine.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
    borrowRecordId: { type: DataTypes.UUID, allowNull: true, field: 'borrow_record_id' },
    amount: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
    reason: { type: DataTypes.STRING(255), allowNull: false },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'waived'),
      allowNull: false,
      defaultValue: 'pending',
    },
    paidAt: { type: DataTypes.DATE, allowNull: true, field: 'paid_at' },
    waivedByUserId: { type: DataTypes.UUID, allowNull: true, field: 'waived_by_user_id' },
    waivedReason: { type: DataTypes.STRING(255), allowNull: true, field: 'waived_reason' },
  },
  { sequelize, modelName: 'Fine', tableName: 'fines' }
);

Fine.belongsTo(User, { foreignKey: 'userId', as: 'member' });
Fine.belongsTo(BorrowRecord, { foreignKey: 'borrowRecordId', as: 'borrowRecord' });
User.hasMany(Fine, { foreignKey: 'userId', as: 'fines' });

module.exports = Fine;