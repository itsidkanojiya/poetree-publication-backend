'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('chapters', {
      chapter_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      chapter_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      subject_title_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'subject_titles', key: 'subject_title_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
    });

    await queryInterface.addColumn('questions', 'chapter_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'chapters', key: 'chapter_id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addColumn('papers', 'chapter_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'chapters', key: 'chapter_id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addColumn('worksheets', 'chapter_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'chapters', key: 'chapter_id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addColumn('answersheets', 'chapter_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'chapters', key: 'chapter_id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('questions', 'chapter_id');
    await queryInterface.removeColumn('papers', 'chapter_id');
    await queryInterface.removeColumn('worksheets', 'chapter_id');
    await queryInterface.removeColumn('answersheets', 'chapter_id');
    await queryInterface.dropTable('chapters');
  },
};
