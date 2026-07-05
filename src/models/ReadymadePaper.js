const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ReadymadePaper = sequelize.define('readymade_papers', {
    readymade_paper_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    subject_id: { type: DataTypes.INTEGER, allowNull: false },
    subject_title_id: { type: DataTypes.INTEGER, allowNull: false },
    chapter_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'chapters', key: 'chapter_id' },
    },
    standard: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'standard', // holds a standard_id value
    },
    board_id: { type: DataTypes.INTEGER, allowNull: false },
    total_marks: { type: DataTypes.INTEGER, allowNull: true },
    // Both files are individually optional; the controller enforces that at least one exists.
    paper_pdf_url: { type: DataTypes.STRING, allowNull: true },
    paper_word_url: { type: DataTypes.STRING, allowNull: true },
}, {
    tableName: 'readymade_papers',
    timestamps: true,
});

module.exports = ReadymadePaper;
