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
    allowNull: true, // Made optional as not in header form
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
    allowNull: true, // Made optional as not in header form
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  subject_title_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Optional - from Subject Title dropdown
  },
  logo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  logo_url: {
    type: DataTypes.STRING,
    allowNull: true, // Optional - for URL input instead of file upload
  },
  board: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  body: {
    type: DataTypes.STRING, // Store an array of question IDs
    allowNull: false,
  },
  // Marks breakdown by question type
  marks_mcq: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  marks_short: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  marks_long: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  marks_blank: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  marks_onetwo: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  marks_truefalse: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  total_marks: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  template_paper_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'papers',
      key: 'id'
    }
  },
  is_template: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  }
}, {
  tableName: 'papers',
  timestamps: false,
});

module.exports = Paper;
