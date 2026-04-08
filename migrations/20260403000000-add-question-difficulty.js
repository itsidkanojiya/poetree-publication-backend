'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('questions', 'difficulty', {
      type: Sequelize.ENUM('easy', 'medium', 'hard'),
      allowNull: false,
      defaultValue: 'medium',
    });
    await queryInterface.sequelize.query(
      "UPDATE questions SET difficulty = 'medium' WHERE difficulty IS NULL OR difficulty = ''"
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('questions', 'difficulty');
  },
};
