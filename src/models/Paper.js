const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // Adjust path as needed

const Paper = sequelize.define('papers', {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  school_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  standard: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  timing: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  division: {
    type: DataTypes.STRING, // e.g., "2 hours"
    allowNull: true,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  logo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  board: {
    type: DataTypes.STRING, // Store an array of question IDs
    allowNull: false,
  },
  body: {
    type: DataTypes.STRING, // Store an array of question IDs
    allowNull: false,
  }
}, {
  tableName: 'papers',
  timestamps: false,
});

module.exports = Paper;
