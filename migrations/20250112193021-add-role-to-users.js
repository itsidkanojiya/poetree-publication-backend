'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('Users', 'role', {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: 'user', // Default role
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('Users', 'role');
    }
};
