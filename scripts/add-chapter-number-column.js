/**
 * One-off script to add chapter_number to the chapters table.
 * Run if sequelize-cli db:migrate fails: node scripts/add-chapter-number-column.js
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
    await queryInterface.addColumn('chapters', 'chapter_number', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    console.log('Added chapter_number to chapters');
  } catch (e) {
    if (e.message && e.message.includes('Duplicate column')) {
      console.log('Column chapters.chapter_number already exists');
    } else throw e;
  }

  await sequelize.close();
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
