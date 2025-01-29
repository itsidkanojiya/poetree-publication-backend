const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Subject Model
const Subject = sequelize.define('Subject', {
    subject_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    subject_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    classes: {
        type: DataTypes.JSON, // Store array of classes
        allowNull: false,
    },
}, {
    tableName: 'subjects',
    timestamps: false,
});

// SubjectTitle Model
const SubjectTitle = sequelize.define('SubjectTitle', {
    subject_title_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    title_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    subject_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'subjects', // References the 'subjects' table
            key: 'subject_id',
        },
    },
    classes: {
        type: DataTypes.JSON, // Store array of classes
        allowNull: false,
    },
}, {
    tableName: 'subject_titles',
    timestamps: false,
});

// Associations
Subject.hasMany(SubjectTitle, { foreignKey: 'subject_id', onDelete: 'CASCADE' });
SubjectTitle.belongsTo(Subject, { foreignKey: 'subject_id' });

module.exports = { Subject, SubjectTitle };
