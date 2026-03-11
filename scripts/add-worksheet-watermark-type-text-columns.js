/**
 * One-off script to add worksheet_watermark_type and worksheet_watermark_text to users table.
 * Run if migrations fail: node scripts/add-worksheet-watermark-type-text-columns.js
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

async function run() {
  const queryInterface = sequelize.getQueryInterface();
  for (const { col, type, def } of [
    { col: 'worksheet_watermark_type', type: Sequelize.STRING(32), def: 'text' },
    { col: 'worksheet_watermark_text', type: Sequelize.STRING(200), def: undefined },
  ]) {
    try {
      await queryInterface.addColumn('users', col, {
        type,
        allowNull: true,
        ...(def !== undefined && { defaultValue: def }),
      });
      console.log('Added users.' + col);
    } catch (err) {
      if (err.message && err.message.includes('Duplicate column name')) {
        console.log('Column users.' + col + ' already exists; skipping.');
      } else throw err;
    }
  }
  await sequelize.close();
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
