const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Catalogue = sequelize.define("Catalogue", {
  catalogue_id: {
    type: DataTypes.INTEGER,
    unique: true,
    allowNull: false,
  },
  catalogue_name: {
    type: DataTypes.STRING,
  },
  catalogue_image_url: {
    type: DataTypes.STRING
  },
  catalogue_pdf_link:{
    type: DataTypes.STRING
  }
}
);


module.exports = Catalogue;