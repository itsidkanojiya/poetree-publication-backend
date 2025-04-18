  
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AnswerSheet = sequelize.define('answersheets', {
    answer_sheet_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    subject_id: { type: DataTypes.INTEGER, allowNull: false },
    subject_title_id: { type: DataTypes.INTEGER, allowNull: false },
    standard: { 
        type: DataTypes.INTEGER, 
        allowNull: false, 
        field: 'standard' // Maps to 'class' column in the database
    },
    board_id: { type: DataTypes.INTEGER, allowNull: false },
    answersheet_url: { type: DataTypes.STRING, allowNull: false },
    answersheet_coverlink: { type: DataTypes.STRING, allowNull: true },
}, {
    timestamps: true,  
});

module.exports = AnswerSheet;
