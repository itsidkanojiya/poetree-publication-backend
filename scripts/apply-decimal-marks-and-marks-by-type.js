/**
 * One-off script: fractional marks + per-type marks JSON.
 * Run if sequelize-cli db:migrate fails:
 *   node scripts/apply-decimal-marks-and-marks-by-type.js
 *
 * 1) questions.marks and the papers marks columns INTEGER -> DECIMAL(6,2), so a
 *    fractional mark (e.g. 0.5 per word) no longer truncates to 0.
 * 2) Adds papers.marks_by_type (JSON text) holding per-type marks for EVERY question
 *    type. The marks_* columns only ever covered 6 types (no passage, no match), so
 *    those marks were silently dropped and left out of total_marks.
 *
 * Idempotent: every column is checked first, and the migration is recorded in
 * SequelizeMeta so a later db:migrate skips it.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    dialect: 'mysql',
    logging: false,
  }
);

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

async function run() {
  const qi = sequelize.getQueryInterface();

  // 1) questions.marks -> DECIMAL
  const qCols = await qi.describeTable('questions');
  if (!qCols.marks) {
    console.log('SKIP questions.marks (column missing)');
  } else if (/decimal/i.test(qCols.marks.type)) {
    console.log('SKIP questions.marks (already ' + qCols.marks.type + ')');
  } else {
    await qi.changeColumn('questions', 'marks', {
      type: Sequelize.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 0,
    });
    console.log('ALTERED questions.marks -> DECIMAL(6,2)');
  }

  // 2) papers marks columns -> DECIMAL
  const pCols = await qi.describeTable('papers');
  for (const col of PAPER_MARKS) {
    if (!pCols[col]) {
      console.log('SKIP papers.' + col + ' (column missing)');
      continue;
    }
    if (/decimal/i.test(pCols[col].type)) {
      console.log('SKIP papers.' + col + ' (already ' + pCols[col].type + ')');
      continue;
    }
    await qi.changeColumn('papers', col, {
      type: Sequelize.DECIMAL(6, 2),
      allowNull: true,
      defaultValue: 0,
    });
    console.log('ALTERED papers.' + col + ' -> DECIMAL(6,2)');
  }

  // 3) papers.marks_by_type
  if (pCols.marks_by_type) {
    console.log('SKIP papers.marks_by_type (already exists)');
  } else {
    await qi.addColumn('papers', 'marks_by_type', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    console.log('ADDED papers.marks_by_type');
  }

  // 4) Record it so a future db:migrate skips this migration.
  try {
    const [rows] = await sequelize.query('SELECT name FROM SequelizeMeta WHERE name = ?', {
      replacements: [NAME],
    });
    if (rows.length === 0) {
      await sequelize.query('INSERT INTO SequelizeMeta (name) VALUES (?)', {
        replacements: [NAME],
      });
      console.log('RECORDED in SequelizeMeta: ' + NAME);
    } else {
      console.log('ALREADY recorded in SequelizeMeta: ' + NAME);
    }
  } catch (e) {
    console.log('NOTE: could not update SequelizeMeta (' + e.message + ') - schema changes still applied.');
  }

  await sequelize.close();
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
