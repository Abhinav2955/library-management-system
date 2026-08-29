const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/db');

class Category extends Model {}

Category.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    parentId: { type: DataTypes.UUID, allowNull: true, field: 'parent_id' },
  },
  { sequelize, modelName: 'Category', tableName: 'categories' }
);

Category.hasMany(Category, { foreignKey: 'parentId', as: 'children' });
Category.belongsTo(Category, { foreignKey: 'parentId', as: 'parent' });

module.exports = Category;