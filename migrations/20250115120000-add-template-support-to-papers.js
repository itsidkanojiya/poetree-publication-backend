'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if columns already exist before adding
    const tableDescription = await queryInterface.describeTable('papers');
    
    // Add template_paper_id column if it doesn't exist
    if (!tableDescription.template_paper_id) {
      await queryInterface.addColumn('papers', 'template_paper_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'papers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }

    // Add is_template column if it doesn't exist
    if (!tableDescription.is_template) {
      await queryInterface.addColumn('papers', 'is_template', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    // Add indexes if they don't exist
    try {
      await queryInterface.addIndex('papers', ['template_paper_id'], {
        name: 'papers_template_paper_id_idx'
      });
    } catch (error) {
      // Index might already exist, ignore error
      console.log('Index papers_template_paper_id_idx might already exist');
    }

    try {
      await queryInterface.addIndex('papers', ['is_template'], {
        name: 'papers_is_template_idx'
      });
    } catch (error) {
      // Index might already exist, ignore error
      console.log('Index papers_is_template_idx might already exist');
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex('papers', 'papers_is_template_idx');
    await queryInterface.removeIndex('papers', 'papers_template_paper_id_idx');

    // Remove columns
    await queryInterface.removeColumn('papers', 'is_template');
    await queryInterface.removeColumn('papers', 'template_paper_id');
  }
};

