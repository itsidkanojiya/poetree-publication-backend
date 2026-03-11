'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'worksheet_watermark_type', {
      type: Sequelize.STRING(32),
      allowNull: true,
      defaultValue: 'text',
    });
    await queryInterface.addColumn('users', 'worksheet_watermark_text', {
      type: Sequelize.STRING(200),
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('users', 'worksheet_watermark_type');
    await queryInterface.removeColumn('users', 'worksheet_watermark_text');
  },
};
