const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');
const { Subject } = require('./Subjects');

const UserSubject = sequelize.define('user_subjects', {
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
    tableName: 'user_subjects',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['user_id'] },
        { fields: ['subject_id'] },
        { fields: ['status'] },
        { fields: ['user_id', 'subject_id'], unique: true },
    ],
});

// Associations
UserSubject.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
UserSubject.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });
UserSubject.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });

module.exports = UserSubject;

