const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/db');
const User = require('./user.model');
const Book = require('./book.model');
const BookCopy = require('./bookCopy.model');

class Reservation extends Model {}

Reservation.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    bookId: { type: DataTypes.UUID, allowNull: false, field: 'book_id' },
    userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
    copyId: { type: DataTypes.UUID, allowNull: true, field: 'copy_id' },
    requestedAt: { type: DataTypes.DATE(3), allowNull: false, field: 'requested_at' },
    readyAt: { type: DataTypes.DATE, allowNull: true, field: 'ready_at' },
    expiresAt: { type: DataTypes.DATE, allowNull: true, field: 'expires_at' },
    status: {
      type: DataTypes.ENUM('waiting', 'ready', 'fulfilled', 'cancelled', 'expired'),
      allowNull: false,
      defaultValue: 'waiting',
    },
  },
  { sequelize, modelName: 'Reservation', tableName: 'reservations' }
);

Reservation.belongsTo(User, { foreignKey: 'userId', as: 'member' });
Reservation.belongsTo(Book, { foreignKey: 'bookId', as: 'book' });
Reservation.belongsTo(BookCopy, { foreignKey: 'copyId', as: 'heldCopy' });

module.exports = Reservation;