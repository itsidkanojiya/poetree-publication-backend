'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'worksheet_watermark_text_size', {
      type: Sequelize.FLOAT,
      allowNull: true,
      defaultValue: 1.0,
    });
    await queryInterface.addColumn('users', 'worksheet_watermark_logo_size', {
      type: Sequelize.FLOAT,
      allowNull: true,
      defaultValue: 1.0,
    });
    await queryInterface.addColumn('users', 'worksheet_watermark_text_bend', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: -35,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('users', 'worksheet_watermark_text_size');
    await queryInterface.removeColumn('users', 'worksheet_watermark_logo_size');
    await queryInterface.removeColumn('users', 'worksheet_watermark_text_bend');
  },
};
