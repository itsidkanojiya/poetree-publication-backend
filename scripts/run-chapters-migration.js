/**
 * One-off script to create chapters table and add chapter_id to questions, papers, worksheets, answersheets.
 * Run if sequelize-cli db:migrate fails: node scripts/run-chapters-migration.js
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
    await queryInterface.createTable('chapters', {
      chapter_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      chapter_name: { type: Sequelize.STRING(200), allowNull: false },
      subject_title_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'subject_titles', key: 'subject_title_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
    });
    console.log('Created table chapters');
  } catch (e) {
    if (e.message && e.message.includes('already exists')) {
      console.log('Table chapters already exists');
    } else throw e;
  }

  for (const table of ['questions', 'papers', 'worksheets', 'answersheets']) {
    try {
      await queryInterface.addColumn(table, 'chapter_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'chapters', key: 'chapter_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
      console.log('Added chapter_id to', table);
    } catch (e) {
      if (e.message && e.message.includes('Duplicate column')) {
        console.log('Column', table + '.chapter_id', 'already exists');
      } else throw e;
    }
  }

  await sequelize.close();
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
