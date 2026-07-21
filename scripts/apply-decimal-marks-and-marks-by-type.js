/**
 * Apply the DECIMAL-marks + marks_by_type migration directly.
 * The repo's migration history is out of sync with the live DB (several columns were
 * added by hand), so `sequelize-cli db:migrate` fails on an older migration before
 * reaching this one. This applies just this change, idempotently, and records it.
 */
const { Sequelize } = require('sequelize');
const sequelize = require('./src/config/db');

const NAME = '20260721000000-decimal-marks-and-marks-by-type.js';
const PAPER_MARKS = [
  'marks_mcq',
  'marks_short',
  'marks_long',
  'marks_blank',
  'marks_onetwo',
  'marks_truefalse',
  'total_marks',
];

(async () => {
  const qi = sequelize.getQueryInterface();

  // 1) questions.marks -> DECIMAL
  const qCols = await qi.describeTable('questions');
  if (qCols.marks && !/decimal/i.test(qCols.marks.type)) {
    await qi.changeColumn('questions', 'marks', {
      type: Sequelize.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 0,
    });
    console.log('ALTERED questions.marks ->', 'DECIMAL(6,2)');
  } else {
    console.log('SKIP questions.marks (already', qCols.marks && qCols.marks.type, ')');
  }

  // 2) papers marks columns -> DECIMAL
  const pCols = await qi.describeTable('papers');
  for (const col of PAPER_MARKS) {
    if (!pCols[col]) {
      console.log('SKIP (missing column)', col);
      continue;
    }
    if (/decimal/i.test(pCols[col].type)) {
      console.log('SKIP (already decimal)', col);
      continue;
    }
    await qi.changeColumn('papers', col, {
      type: Sequelize.DECIMAL(6, 2),
      allowNull: true,
      defaultValue: 0,
    });
    console.log('ALTERED papers.' + col, '-> DECIMAL(6,2)');
  }

  // 3) papers.marks_by_type
  if (!pCols.marks_by_type) {
    await qi.addColumn('papers', 'marks_by_type', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    console.log('ADDED papers.marks_by_type');
  } else {
    console.log('SKIP papers.marks_by_type (exists)');
  }

  // 4) record so a future db:migrate skips it
  const [rows] = await sequelize.query('SELECT name FROM SequelizeMeta WHERE name = ?', {
    replacements: [NAME],
  });
  if (rows.length === 0) {
    await sequelize.query('INSERT INTO SequelizeMeta (name) VALUES (?)', { replacements: [NAME] });
    console.log('RECORDED in SequelizeMeta:', NAME);
  } else {
    console.log('ALREADY recorded:', NAME);
  }

  process.exit(0);
})().catch((e) => {
  console.error('ERR', e.name, e.message);
  process.exit(1);
});
