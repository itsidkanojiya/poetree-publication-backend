const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Class Model
const Class = sequelize.define('Class', {
    class_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    class_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    tableName: 'classes', // Maps to 'classes' table
    timestamps: false, // No createdAt/updatedAt fields
});

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
    class_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'classes', // References the 'classes' table
            key: 'class_id',
        },
    },
}, {
    tableName: 'subjects', // Ensures it maps to the 'subjects' table
    timestamps: false, // Disables createdAt/updatedAt fields
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
    class_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'classes', // References the 'classes' table
            key: 'class_id',
        },
    },
}, {
    tableName: 'subject_titles', // Maps to 'subject_titles' table
    timestamps: false, // No createdAt/updatedAt fields
});

// Associations
Class.hasMany(Subject, { foreignKey: 'class_id', onDelete: 'CASCADE' });
Subject.belongsTo(Class, { foreignKey: 'class_id' });

Subject.hasMany(SubjectTitle, { foreignKey: 'subject_id', onDelete: 'CASCADE' });
SubjectTitle.belongsTo(Subject, { foreignKey: 'subject_id' });

Class.hasMany(SubjectTitle, { foreignKey: 'class_id', onDelete: 'CASCADE' });
SubjectTitle.belongsTo(Class, { foreignKey: 'class_id' });

module.exports = { Subject, SubjectTitle, Class };
