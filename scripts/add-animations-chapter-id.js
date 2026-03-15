/**
 * One-off script to add chapter_id to animations table.
 * Run: node scripts/add-animations-chapter-id.js
 * Requires: .env with DB_* and existing animations + chapters tables.
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
    await queryInterface.addColumn('animations', 'chapter_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'chapters', key: 'chapter_id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    console.log('Added chapter_id to animations');
  } catch (e) {
    if (e.message && e.message.includes('Duplicate column')) {
      console.log('Column animations.chapter_id already exists');
    } else throw e;
  }

  await sequelize.close();
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
