const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');
const { Subject, SubjectTitle } = require('./Subjects');

const UserSubjectTitle = sequelize.define('user_subject_titles', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    subject_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'subjects',
            key: 'subject_id',
        },
    },
    subject_title_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'subject_titles',
            key: 'subject_title_id',
        },
    },
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
    },
    approved_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'user_subject_titles',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['user_id'] },
        { fields: ['subject_id'] },
        { fields: ['subject_title_id'] },
        { fields: ['status'] },
        { fields: ['user_id', 'subject_title_id'], unique: true },
    ],
});

// Associations
UserSubjectTitle.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
UserSubjectTitle.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });
UserSubjectTitle.belongsTo(SubjectTitle, { foreignKey: 'subject_title_id', as: 'subjectTitle' });
UserSubjectTitle.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });

module.exports = UserSubjectTitle;

