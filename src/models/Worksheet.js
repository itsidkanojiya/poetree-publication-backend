const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Worksheet = sequelize.define('worksheet', {
    worksheet_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    subject_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    }, 
    subject_title_id: { type: DataTypes.INTEGER, allowNull: false },
    standard: { 
        type: DataTypes.INTEGER, 
        allowNull: false, 
        field: 'standard' // Maps to 'standard' column in the database
    },
    board_id: { type: DataTypes.INTEGER, allowNull: false },
    worksheet_url: {
        type: DataTypes.STRING, 
        allowNull: false,
    },
    worksheet_coverlink: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    tableName: 'worksheets',
    timestamps: true,
});

module.exports = Worksheet;
