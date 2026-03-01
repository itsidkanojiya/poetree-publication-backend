/**
 * One-off script to add worksheet_watermark_opacity to users table.
 * Use this if sequelize-cli db:migrate fails (e.g. older migrations already applied via sync).
 * Run: node scripts/run-worksheet-opacity-migration.js
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
  try {
    await queryInterface.addColumn('users', 'worksheet_watermark_opacity', {
      type: sequelize.Sequelize.FLOAT,
      allowNull: true,
      defaultValue: 0.3,
    });
    console.log('✅ Added column users.worksheet_watermark_opacity');
  } catch (err) {
    if (err.message && err.message.includes('Duplicate column name')) {
      console.log('ℹ️ Column users.worksheet_watermark_opacity already exists; nothing to do.');
    } else {
      throw err;
    }
  } finally {
    await sequelize.close();
  }
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
