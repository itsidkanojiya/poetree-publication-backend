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
  chapter_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'chapters', key: 'chapter_id' },
  },
  question: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  answer: {
    type: DataTypes.TEXT,
    allowNull: true, // Optional: matches DB (answer TEXT NULL)
  },
  solution: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  difficulty: {
    type: DataTypes.ENUM('easy', 'medium', 'hard'),
    allowNull: false,
    defaultValue: 'medium',
  },
  options: {
    type: DataTypes.TEXT,
    allowNull: true,
  },image_url: {
    type: DataTypes.STRING,  // Make sure this field exists
    allowNull: true
},
  // Multi-image + fabric composite support
  images: {
    type: DataTypes.TEXT, // JSON array of relative source-image paths
    allowNull: true,
  },
  image_layout: {
    type: DataTypes.TEXT('long'), // fabric canvas JSON (may embed base64)
    allowNull: true,
  },
  composite_image_url: {
    type: DataTypes.STRING, // relative path to flattened composite PNG
    allowNull: true,
  },
  composite_width: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  composite_height: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  image_placement: {
    type: DataTypes.STRING, // inline | above | below | left | right
    allowNull: true,
  },
  image_align: {
    type: DataTypes.STRING, // left | center | right
    allowNull: true,
  },
  marks: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'questions',
  timestamps: false,
});

module.exports = Question;
