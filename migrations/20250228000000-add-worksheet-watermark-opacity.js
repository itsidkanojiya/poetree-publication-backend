'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'worksheet_watermark_opacity', {
      type: Sequelize.FLOAT,
      allowNull: true,
      defaultValue: 0.3,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('users', 'worksheet_watermark_opacity');
  },
};
