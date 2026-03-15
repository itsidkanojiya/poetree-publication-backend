/**
 * One-off script to add chapter_ids (JSON array) to papers table.
 * Run: node scripts/add-papers-chapter-ids.js
 * Optional: backfill chapter_ids from chapter_id (single) so existing rows have chapter_ids = [chapter_id].
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
    logging: console.log,
  }
);

async function run() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    await queryInterface.addColumn('papers', 'chapter_ids', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    console.log('Added chapter_ids to papers');
  } catch (e) {
    if (e.message && e.message.includes('Duplicate column')) {
      console.log('Column papers.chapter_ids already exists');
    } else throw e;
  }

  // Backfill: set chapter_ids = [chapter_id] where chapter_id is not null and chapter_ids is null
  try {
    const [rows] = await sequelize.query(
      "UPDATE papers SET chapter_ids = JSON_ARRAY(chapter_id) WHERE chapter_id IS NOT NULL AND (chapter_ids IS NULL OR chapter_ids = '')"
    );
    console.log('Backfilled chapter_ids from chapter_id where applicable');
  } catch (e) {
    console.warn('Backfill skipped or failed:', e.message);
  }

  await sequelize.close();
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
