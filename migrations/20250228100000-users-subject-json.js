'use strict';

/**
 * Change users.subject and users.subject_title from INT to JSON
 * so they can store arrays of IDs (matches approveUserSelections and other code).
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== 'mysql') {
      await queryInterface.changeColumn('users', 'subject', {
        type: Sequelize.JSON,
        allowNull: true,
      });
      await queryInterface.changeColumn('users', 'subject_title', {
        type: Sequelize.JSON,
        allowNull: true,
      });
      return;
    }
    await queryInterface.sequelize.query(
      'ALTER TABLE `users` MODIFY COLUMN `subject` JSON NULL DEFAULT NULL;'
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE `users` MODIFY COLUMN `subject_title` JSON NULL DEFAULT NULL;'
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('users', 'subject', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.changeColumn('users', 'subject_title', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },
};
