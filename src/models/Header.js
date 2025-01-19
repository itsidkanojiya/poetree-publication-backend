  
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Header = sequelize.define('Header', {
    exam_type: { type: DataTypes.STRING, allowNull: false },
    school_name: { type: DataTypes.STRING, allowNull: false },
    logo_url: { type: DataTypes.STRING, allowNull: true },
    subject_id: { type: DataTypes.INTEGER, allowNull: false },
});

module.exports = Header;
