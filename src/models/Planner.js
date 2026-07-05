const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Planner = sequelize.define('planners', {
    planner_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    subject_id: { type: DataTypes.INTEGER, allowNull: false },
    board_id: { type: DataTypes.INTEGER, allowNull: false },
    standard: { type: DataTypes.JSON, allowNull: false }, // array of standard_ids
    planner_pdf_url: { type: DataTypes.STRING, allowNull: false },
}, {
    tableName: 'planners',
    timestamps: true,
});

module.exports = Planner;
