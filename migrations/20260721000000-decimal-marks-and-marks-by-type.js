"use strict";

/**
 * 1) Marks become DECIMAL so fractional marks (e.g. 0.5 per word for synonyms/antonyms)
 *    are possible. They were INTEGER, which silently truncated 0.5 to 0.
 * 2) `papers.marks_by_type` (JSON text) holds the per-type marks for EVERY question type.
 *    The per-type marks columns only ever covered 6 types — there is no marks_passage
 *    and no marks_match — so passage/match marks were silently dropped and left out of
 *    total_marks. Rather than adding a column per type forever, all types now go in this
 *    one field; the legacy columns are still written for backward compatibility.
 */

const DECIMAL = { type: "DECIMAL(6,2)", allowNull: true, defaultValue: 0 };

const PAPER_MARKS_COLUMNS = [
  "marks_mcq",
  "marks_short",
  "marks_long",
  "marks_blank",
  "marks_onetwo",
  "marks_truefalse",
  "total_marks",
];

module.exports = {
  async up(queryInterface, Sequelize) {
    // questions.marks: INTEGER -> DECIMAL (NOT NULL, matching the model)
    await queryInterface.changeColumn("questions", "marks", {
      type: Sequelize.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 0,
    });

    for (const col of PAPER_MARKS_COLUMNS) {
      await queryInterface.changeColumn("papers", col, {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
        defaultValue: 0,
      });
    }

    const papers = await queryInterface.describeTable("papers");
    if (!papers.marks_by_type) {
      await queryInterface.addColumn("papers", "marks_by_type", {
        type: Sequelize.TEXT, // JSON: { mcq: 10, synonyms: 3, ... }
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const papers = await queryInterface.describeTable("papers");
    if (papers.marks_by_type) {
      await queryInterface.removeColumn("papers", "marks_by_type");
    }

    for (const col of PAPER_MARKS_COLUMNS) {
      await queryInterface.changeColumn("papers", col, {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      });
    }

    await queryInterface.changeColumn("questions", "marks", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },
};

module.exports.DECIMAL = DECIMAL;
