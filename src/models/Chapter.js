const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const { SubjectTitle } = require('./Subjects');

const Chapter = sequelize.define('Chapter', {
  chapter_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  chapter_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  subject_title_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'subject_titles', key: 'subject_title_id' },
  },
}, {
  tableName: 'chapters',
  timestamps: false,
});

Chapter.belongsTo(SubjectTitle, { foreignKey: 'subject_title_id', as: 'subject_title' });
SubjectTitle.hasMany(Chapter, { foreignKey: 'subject_title_id' });

module.exports = Chapter;
