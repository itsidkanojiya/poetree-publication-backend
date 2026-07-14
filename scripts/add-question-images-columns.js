/**
 * One-off script to add the multi-image + fabric "composite" columns to questions.
 * Mirrors migrations/20260711000000-add-question-images.js.
 *
 * Safe to re-run: existing columns are skipped.
 *   node scripts/add-question-images-columns.js
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

// Column name -> definition (keep in sync with the migration).
const COLUMNS = {
  images: { type: Sequelize.TEXT, allowNull: true },
  image_layout: { type: Sequelize.TEXT('long'), allowNull: true },
  composite_image_url: { type: Sequelize.STRING, allowNull: true },
  composite_width: { type: Sequelize.INTEGER, allowNull: true },
  composite_height: { type: Sequelize.INTEGER, allowNull: true },
  image_placement: { type: Sequelize.STRING, allowNull: true },
  image_align: { type: Sequelize.STRING, allowNull: true },
};

async function run() {
  const queryInterface = sequelize.getQueryInterface();
  let added = 0;
  let skipped = 0;

  for (const [name, def] of Object.entries(COLUMNS)) {
    try {
      await queryInterface.addColumn('questions', name, def);
      console.log(`Added questions.${name}`);
      added++;
    } catch (e) {
      if (e.message && e.message.includes('Duplicate column')) {
        console.log(`Column questions.${name} already exists`);
        skipped++;
      } else throw e;
    }
  }

  await sequelize.close();
  console.log(`Done. ${added} added, ${skipped} already present.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
