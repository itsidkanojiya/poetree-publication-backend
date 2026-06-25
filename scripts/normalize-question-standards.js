/**
 * Normalize questions.standard to the canonical standard_id.
 *
 * The questions.standard column historically stored a mix of values: the
 * standard_id (e.g. 26) and the display name / grade number (e.g. "6"). The app
 * filters by standard_id (context selector, smart paper), so questions saved as
 * "6" never match standard=26 and appear "missing".
 *
 * This script converts any standard value that is a grade NAME (e.g. 6 -> 26)
 * into its standard_id. Values that are already valid standard_ids are left
 * untouched (so ambiguous numbers like 9/12 that ARE real ids are treated as ids).
 *
 * SAFE BY DEFAULT (dry run):
 *   node scripts/normalize-question-standards.js            # report only
 *   node scripts/normalize-question-standards.js --confirm  # apply updates
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const { Sequelize, QueryTypes } = require('sequelize');

const CONFIRM = process.argv.slice(2).includes('--confirm');

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
  console.log('--- Normalize questions.standard to standard_id ---');
  console.log(`mode = ${CONFIRM ? 'APPLY (--confirm)' : 'DRY RUN (report only)'}\n`);

  // Load the standards table → build id set and name→id map
  const standards = await sequelize.query(
    'SELECT standard_id, name FROM standards',
    { type: QueryTypes.SELECT }
  );
  const idSet = new Set(standards.map((s) => s.standard_id));
  const nameToId = new Map();
  standards.forEach((s) => nameToId.set(String(s.name).trim(), s.standard_id));

  // Current distinct standard values used by questions, with counts
  const distinct = await sequelize.query(
    'SELECT standard, COUNT(*) AS count FROM questions GROUP BY standard ORDER BY standard',
    { type: QueryTypes.SELECT }
  );

  console.log('Current questions.standard values:');
  const plan = []; // { from, to, count }
  for (const row of distinct) {
    const v = row.standard;
    if (v === null) {
      console.log(`  (null): ${row.count} — left as-is`);
      continue;
    }
    if (idSet.has(v)) {
      console.log(`  ${v}: ${row.count} — already a standard_id, OK`);
      continue;
    }
    const target = nameToId.get(String(v));
    if (target != null) {
      console.log(`  ${v}: ${row.count} — grade name, will convert to standard_id ${target}`);
      plan.push({ from: v, to: target, count: row.count });
    } else {
      console.log(`  ${v}: ${row.count} — UNKNOWN (not an id, not a grade name), left as-is`);
    }
  }
  console.log('');

  if (plan.length === 0) {
    console.log('Nothing to convert. All standard values are already canonical.');
    await sequelize.close();
    return;
  }

  const totalRows = plan.reduce((sum, p) => sum + Number(p.count), 0);
  console.log(`${plan.length} value(s) to convert, affecting ${totalRows} question(s).`);

  if (!CONFIRM) {
    console.log('\nDRY RUN — nothing was changed. Re-run with --confirm to apply.');
    await sequelize.close();
    return;
  }

  // Apply conversions inside a transaction
  const t = await sequelize.transaction();
  try {
    for (const p of plan) {
      await sequelize.query(
        'UPDATE questions SET standard = :to WHERE standard = :from',
        { replacements: { to: p.to, from: p.from }, type: QueryTypes.UPDATE, transaction: t }
      );
      console.log(`  Converted ${p.count} row(s): ${p.from} -> ${p.to}`);
    }
    await t.commit();
    console.log('\nDone. All question standards are now canonical standard_ids.');
  } catch (e) {
    await t.rollback();
    throw e;
  }

  await sequelize.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
