"use strict";

/**
 * Adds the rich-text ("Word-like") question fields.
 *
 * - question_html : sanitized HTML body of the question (may contain tables,
 *                   <img> and KaTeX markup)
 * - options_html  : JSON string array of HTML fragments, index-aligned 1:1 with
 *                   the plain `options` array
 * - solution_html : sanitized HTML body of the solution
 *
 * The plain-text columns (`question`, `options`, `solution`) remain the source of
 * truth for consumers that cannot render HTML — notably the pdf-lib quiz PDF and
 * the live-quiz session payload. They are always regenerated from the *_html
 * siblings on write, so the two can never drift.
 *
 * LONGTEXT (same as image_layout) because HTML can embed large content.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("questions", "question_html", {
      type: Sequelize.TEXT("long"),
      allowNull: true,
    });
    await queryInterface.addColumn("questions", "options_html", {
      type: Sequelize.TEXT("long"),
      allowNull: true,
    });
    await queryInterface.addColumn("questions", "solution_html", {
      type: Sequelize.TEXT("long"),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("questions", "question_html");
    await queryInterface.removeColumn("questions", "options_html");
    await queryInterface.removeColumn("questions", "solution_html");
  },
};
