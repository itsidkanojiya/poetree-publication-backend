const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // Adjust path as needed

const Question = sequelize.define('questions', {
  question_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
  },
  subject_title_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  subject_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  standard: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  board_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  question: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  answer: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  solution: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  options: {
    type: DataTypes.TEXT,
    allowNull: true,
  },image_url: {
    type: DataTypes.STRING,  // Make sure this field exists
    allowNull: true
}, marks: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'questions',
  timestamps: false,
});

module.exports = Question;
