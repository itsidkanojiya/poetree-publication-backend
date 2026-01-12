'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Add address column to users table
        await queryInterface.addColumn('users', 'address', {
            type: Sequelize.STRING,
            allowNull: true,
        });

        // Add logo column to users table
        await queryInterface.addColumn('users', 'logo', {
            type: Sequelize.STRING,
            allowNull: true,
        });

        // Add logo_url column to users table
        await queryInterface.addColumn('users', 'logo_url', {
            type: Sequelize.STRING,
            allowNull: true,
        });

        // Make school_name, address, logo nullable in papers table (if not already)
        // Note: This might fail if columns are already nullable, but that's okay
        try {
            await queryInterface.changeColumn('papers', 'school_name', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        } catch (error) {
            console.log('school_name column might already be nullable or not exist');
        }

        try {
            await queryInterface.changeColumn('papers', 'address', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        } catch (error) {
            console.log('address column might already be nullable or not exist');
        }

        try {
            await queryInterface.changeColumn('papers', 'logo', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        } catch (error) {
            console.log('logo column might already be nullable or not exist');
        }
    },

    down: async (queryInterface, Sequelize) => {
        // Remove columns from users table
        await queryInterface.removeColumn('users', 'address');
        await queryInterface.removeColumn('users', 'logo');
        await queryInterface.removeColumn('users', 'logo_url');

        // Revert papers table columns back to not null (if needed)
        // Note: This might fail if you want to keep them nullable
        try {
            await queryInterface.changeColumn('papers', 'school_name', {
                type: Sequelize.STRING,
                allowNull: false,
            });
        } catch (error) {
            console.log('Could not revert school_name column');
        }

        try {
            await queryInterface.changeColumn('papers', 'address', {
                type: Sequelize.STRING,
                allowNull: false,
            });
        } catch (error) {
            console.log('Could not revert address column');
        }

        try {
            await queryInterface.changeColumn('papers', 'logo', {
                type: Sequelize.STRING,
                allowNull: false,
            });
        } catch (error) {
            console.log('Could not revert logo column');
        }
    }
};





