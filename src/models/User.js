const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
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
    role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'user', // Default role is 'user'
    },
    school_name: {
        type: DataTypes.STRING,
    },
    school_address_state: {
        type: DataTypes.STRING,
    },
    school_address_pincode: {
        type: DataTypes.STRING,
    },
    school_address_city: {
        type: DataTypes.STRING,
    },
    school_principal_name: {
        type: DataTypes.STRING,
    },
    subject: {
        type: DataTypes.STRING,
    },
    subject_title: {
        type: DataTypes.STRING,
    },
    standard: {
        type: DataTypes.STRING,
    },
    otp: {
        type: DataTypes.STRING,
    },
}, {
    timestamps: true,
});

module.exports = User;
