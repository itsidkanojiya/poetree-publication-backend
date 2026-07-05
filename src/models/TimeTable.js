const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TimeTable = sequelize.define('timetables', {
    timetable_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    subject_id: { type: DataTypes.INTEGER, allowNull: false },
    board_id: { type: DataTypes.INTEGER, allowNull: false },
    standard: { type: DataTypes.JSON, allowNull: false }, // array of standard_ids
    timetable_pdf_url: { type: DataTypes.STRING, allowNull: false },
}, {
    tableName: 'timetables',
    timestamps: true,
});

module.exports = TimeTable;
