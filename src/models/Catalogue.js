// Model: catalogueModel.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');


const Catalogue = sequelize.define('catalogues', {
    catalogue_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    catalogue_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    catalogue_image_url: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    catalogue_pdf_link: {
        type: DataTypes.STRING,
        allowNull: false,
    },
});

module.exports = Catalogue