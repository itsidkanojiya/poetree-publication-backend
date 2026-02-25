'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn('worksheets', 'worksheet_coverlink', {
            type: Sequelize.STRING,
            allowNull: true,
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn('worksheets', 'worksheet_coverlink', {
            type: Sequelize.STRING,
            allowNull: false,
        });
    }
};
