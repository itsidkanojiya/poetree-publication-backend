const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const { Subject, SubjectTitle, Boards } = require('./Subjects');
const Standard = require('./Standard');

const Animation = sequelize.define('animations', {
  animation_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Optional title for the animation/video',
  },
  youtube_url: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: 'Full YouTube URL (watch or youtu.be)',
  },
  video_id: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Extracted YouTube video ID for embedding',
  },
  subject_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  subject_title_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  board_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  standard_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'animations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

Animation.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });
Animation.belongsTo(SubjectTitle, { foreignKey: 'subject_title_id', as: 'subject_title' });
Animation.belongsTo(Boards, { foreignKey: 'board_id', as: 'board' });
Animation.belongsTo(Standard, { foreignKey: 'standard_id', as: 'standard' });

module.exports = Animation;
