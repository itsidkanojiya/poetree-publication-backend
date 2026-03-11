/**
 * One-off: alter users.subject and users.subject_title from INT to JSON.
 * Run if sequelize-cli migration fails or you don't use migrations.
 * Run: node scripts/alter-users-subject-to-json.js
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
  try {
    await sequelize.query('ALTER TABLE `users` MODIFY COLUMN `subject` JSON NULL DEFAULT NULL;');
    console.log('✅ users.subject -> JSON');
  } catch (err) {
    console.error('subject:', err.message);
  }
  try {
    await sequelize.query('ALTER TABLE `users` MODIFY COLUMN `subject_title` JSON NULL DEFAULT NULL;');
    console.log('✅ users.subject_title -> JSON');
  } catch (err) {
    console.error('subject_title:', err.message);
  }
  await sequelize.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
