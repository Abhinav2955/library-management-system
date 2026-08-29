const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/db');

class Author extends Model {}

Author.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    bio: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, modelName: 'Author', tableName: 'authors' }
);

module.exports = Author;