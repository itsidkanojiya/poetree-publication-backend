const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Subject = sequelize.define('Subject', {
    name: { type: DataTypes.STRING, allowNull: false },
});

const SubjectTitle = sequelize.define('SubjectTitle', {
    title: { type: DataTypes.STRING, allowNull: false },
    subject_id: { type: DataTypes.INTEGER, allowNull: false },
});

const Class = sequelize.define('Class', {
    class_level: { type: DataTypes.INTEGER, allowNull: false },
    subject_title_id: { type: DataTypes.INTEGER, allowNull: false },
});

// Associations
Subject.hasMany(SubjectTitle, { foreignKey: 'subject_id', onDelete: 'CASCADE' });
SubjectTitle.belongsTo(Subject, { foreignKey: 'subject_id' });

SubjectTitle.hasMany(Class, { foreignKey: 'subject_title_id', onDelete: 'CASCADE' });
Class.belongsTo(SubjectTitle, { foreignKey: 'subject_title_id' });

module.exports = { Subject, SubjectTitle, Class };
