 
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');


const Worksheet = sequelize.define('Worksheet', {
    worksheet_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    subject_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    worksheet_url: {
        type: DataTypes.STRING, 
        allowNull: false,
    },
    worksheet_logo: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    tableName: 'worksheets',
    timestamps: true, // Disable timestamps if not needed
});

module.exports = Worksheet;
