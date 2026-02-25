const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Header = sequelize.define('headers', {
    header_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    exam_type: { type: DataTypes.STRING, allowNull: false },
    school_name: { type: DataTypes.STRING, allowNull: false },
    logo_url: { type: DataTypes.STRING, allowNull: false  },
    subject_title_id: { type: DataTypes.INTEGER, allowNull: false, field: 'subject_title_id' },
    user_id: { type: DataTypes.INTEGER, allowNull: false }, // Added user_id field
}, {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
    underscored: true, // Converts camelCase fields to snake_case in the database
});

module.exports = Header;
