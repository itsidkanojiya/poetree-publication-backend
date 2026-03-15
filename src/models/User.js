const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const { Subject } = require('../models/Subjects');


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
    address: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    logo: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    logo_url: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    worksheet_watermark_opacity: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 0.3,
    },
    worksheet_watermark_type: {
        type: DataTypes.STRING(32),
        allowNull: true,
        defaultValue: 'text',
    },
    worksheet_watermark_text: {
        type: DataTypes.STRING(200),
        allowNull: true,
    },
    worksheet_watermark_text_size: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 1.0,
    },
    worksheet_watermark_logo_size: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 1.0,
    },
    worksheet_watermark_text_bend: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: -35,
    },
    subject: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
    },
    subject_title: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
    },
    standard: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
    },
    is_verified: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
    },
    is_number_verified: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
    },
    otp: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
    underscored: true, // Converts camelCase to snake_case for DB fields
});

User.belongsTo(Subject, {
  foreignKey: 'subject_titles',  // User.subject_title → Subject.subject_id
  targetKey: 'subject_id',
});


module.exports = User;
