  
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AnswerSheet = sequelize.define('answersheet', {
    answer_sheet_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    subject_id: { type: DataTypes.INTEGER, allowNull: false },
    subject_title_id: { type: DataTypes.INTEGER, allowNull: false },
    class: { 
        type: DataTypes.INTEGER, 
        allowNull: false, 
        field: 'class' // Maps to 'class' column in the database
    },
    board_id: { type: DataTypes.INTEGER, allowNull: false },
    answer_sheet_url: { type: DataTypes.STRING, allowNull: false },
    answer_sheet_logo: { type: DataTypes.STRING, allowNull: true },
}, {
    timestamps: true,  
});

module.exports = AnswerSheet;
