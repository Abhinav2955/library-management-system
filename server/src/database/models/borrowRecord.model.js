const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/db');
const User = require('./user.model');
const BookCopy = require('./bookCopy.model');

class BorrowRecord extends Model {}

BorrowRecord.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    copyId: { type: DataTypes.UUID, allowNull: false, field: 'copy_id' },
    userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
    borrowedAt: { type: DataTypes.DATE, allowNull: false, field: 'borrowed_at' },
    dueAt: { type: DataTypes.DATE, allowNull: false, field: 'due_at' },
    returnedAt: { type: DataTypes.DATE, allowNull: true, field: 'returned_at' },
    renewedCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'renewed_count' },
    status: {
      type: DataTypes.ENUM('active', 'returned', 'overdue', 'lost'),
      allowNull: false,
      defaultValue: 'active',
    },
  },
  { sequelize, modelName: 'BorrowRecord', tableName: 'borrow_records' }
);

BorrowRecord.belongsTo(User, { foreignKey: 'userId', as: 'borrower' });
BorrowRecord.belongsTo(BookCopy, { foreignKey: 'copyId', as: 'copy' });
User.hasMany(BorrowRecord, { foreignKey: 'userId', as: 'borrowRecords' });
BookCopy.hasMany(BorrowRecord, { foreignKey: 'copyId', as: 'borrowRecords' });

module.exports = BorrowRecord;