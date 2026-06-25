/**
 * Clean up orphaned questions that have a wrong `standard` value.
 *
 * Background: subject title 33 had questions saved with standard = 26 (a bad value;
 * grades are 1-12). The correct questions use standard = 6. The standard=26 rows are
 * never shown in the admin panel (it filters standard=6) but still appear in the
 * smart-paper / public API (which queries standard=26), so they look "undeleted".
 *
 * SAFE BY DEFAULT: running with no flag only REPORTS what it would do (dry run).
 *   node scripts/cleanup-orphan-standard-questions.js                 # dry run (report only)
 *   node scripts/cleanup-orphan-standard-questions.js --confirm       # actually delete
 *
 * Optional overrides:
 *   --subject_title_id=33   (default 33)
 *   --standard=26           (the bad standard to remove; default 26)
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const { Sequelize, QueryTypes } = require('sequelize');

// --- parse args ---
const args = process.argv.slice(2);
const getArg = (name, def) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : def;
};
const CONFIRM = args.includes('--confirm');
const SUBJECT_TITLE_ID = parseInt(getArg('subject_title_id', '33'), 10);
const BAD_STANDARD = parseInt(getArg('standard', '26'), 10);

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

async function run() {
  console.log('--- Orphan standard cleanup ---');
  console.log(`subject_title_id = ${SUBJECT_TITLE_ID}, bad standard = ${BAD_STANDARD}`);
  console.log(`mode = ${CONFIRM ? 'DELETE (--confirm)' : 'DRY RUN (report only)'}\n`);

  // 1. Show the split of standards for this subject title
  const split = await sequelize.query(
    'SELECT standard, COUNT(*) AS count FROM questions WHERE subject_title_id = :stId GROUP BY standard ORDER BY standard',
    { replacements: { stId: SUBJECT_TITLE_ID }, type: QueryTypes.SELECT }
  );
  console.log('Questions per standard for this subject title:');
  split.forEach((r) => console.log(`  standard ${r.standard}: ${r.count}`));
  console.log('');

  // 2. List the rows that would be removed
  const orphans = await sequelize.query(
    'SELECT question_id, standard, chapter_id, type FROM questions WHERE subject_title_id = :stId AND standard = :bad ORDER BY question_id',
    { replacements: { stId: SUBJECT_TITLE_ID, bad: BAD_STANDARD }, type: QueryTypes.SELECT }
  );

  if (orphans.length === 0) {
    console.log(`No questions found with standard = ${BAD_STANDARD}. Nothing to do.`);
    await sequelize.close();
    return;
  }

  console.log(`Found ${orphans.length} question(s) with standard = ${BAD_STANDARD}:`);
  console.log('  ids: ' + orphans.map((o) => o.question_id).join(', '));
  console.log('');

  if (!CONFIRM) {
    console.log('DRY RUN — nothing was deleted.');
    console.log('Re-run with --confirm to delete these rows:');
    console.log(`  node scripts/cleanup-orphan-standard-questions.js --confirm --subject_title_id=${SUBJECT_TITLE_ID} --standard=${BAD_STANDARD}`);
    await sequelize.close();
    return;
  }

  // 3. Delete
  const deleted = await sequelize.query(
    'DELETE FROM questions WHERE subject_title_id = :stId AND standard = :bad',
    { replacements: { stId: SUBJECT_TITLE_ID, bad: BAD_STANDARD }, type: QueryTypes.DELETE }
  );

  console.log(`Deleted ${orphans.length} question(s) with standard = ${BAD_STANDARD}.`);
  await sequelize.close();
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
