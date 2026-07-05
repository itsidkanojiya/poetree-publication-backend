const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PaperStyle = sequelize.define('paper_styles', {
    paper_style_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    subject_id: { type: DataTypes.INTEGER, allowNull: false },
    board_id: { type: DataTypes.INTEGER, allowNull: false },
    standard: { type: DataTypes.JSON, allowNull: false }, // array of standard_ids
    paper_style_pdf_url: { type: DataTypes.STRING, allowNull: false },
}, {
    tableName: 'paper_styles',
    timestamps: true,
});

module.exports = PaperStyle;
