'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Check if column already exists before adding
        const tableDescription = await queryInterface.describeTable('users');
        if (!tableDescription.user_type) {
            await queryInterface.addColumn('users', 'user_type', {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: 'user', // Default user_type
            });
        }
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('users', 'user_type');
    }
};
