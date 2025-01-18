const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Catalogue = sequelize.define(
  "Catalogue",
  {
    catalogue_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true, // Ensures auto-generation
      allowNull: false,
    },
    catalogue_name: {
      type: DataTypes.STRING,
    },
    catalogue_image_url: {
      type: DataTypes.STRING,
    },
    catalogue_pdf_link: {
      type: DataTypes.STRING,
    },
  },
  {
    timestamps: false,
  }
);

module.exports = Catalogue;
