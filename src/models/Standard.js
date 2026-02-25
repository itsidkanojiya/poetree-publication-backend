const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Standard = sequelize.define('standards', {
  standard_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Display name e.g. Toddlers, A, B, C, 1, 2, ... 12',
  },
  sort_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Order for display: Toddlers, A, B, C, then 1-12',
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Optional: pre_primary, primary, etc.',
  },
}, {
  tableName: 'standards',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Standard;
