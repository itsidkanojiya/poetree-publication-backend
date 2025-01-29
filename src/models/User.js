const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Define the User model
const User = sequelize.define('users', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        validate: {
            isEmail: true,
        },
    },
    phone_number: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
    },
    username: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    user_type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'user', // Default user_type is 'user'
    },
    school_name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    school_address_state: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    school_address_pincode: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    school_address_city: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    school_principal_name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    subject: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    subject_title: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    class: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
    },
    otp: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
    underscored: true, // Converts camelCase to snake_case for DB fields
});

module.exports = User;