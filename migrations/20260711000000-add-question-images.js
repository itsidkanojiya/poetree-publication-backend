"use strict";

/**
 * Adds multi-image + fabric "composite" support to questions.
 *
 * - images              : JSON array (string) of relative source-image paths
 * - image_layout        : fabric canvas JSON (may embed base64) — used to re-open the editor
 * - composite_image_url : relative path to the flattened composite PNG (the render artifact)
 * - composite_width     : CSS px (1x) of the composite block
 * - composite_height    : CSS px (1x) of the composite block
 * - image_placement     : inline | above | below | left | right
 * - image_align         : left | center | right
 *
 * The legacy single `image_url` column is left untouched for backward compatibility.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("questions", "images", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("questions", "image_layout", {
      // LONGTEXT — fabric JSON can embed base64 image data
      type: Sequelize.TEXT("long"),
      allowNull: true,
    });
    await queryInterface.addColumn("questions", "composite_image_url", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("questions", "composite_width", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn("questions", "composite_height", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn("questions", "image_placement", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("questions", "image_align", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("questions", "images");
    await queryInterface.removeColumn("questions", "image_layout");
    await queryInterface.removeColumn("questions", "composite_image_url");
    await queryInterface.removeColumn("questions", "composite_width");
    await queryInterface.removeColumn("questions", "composite_height");
    await queryInterface.removeColumn("questions", "image_placement");
    await queryInterface.removeColumn("questions", "image_align");
  },
};
