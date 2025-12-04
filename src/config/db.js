const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database connection setup
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        logging: console.log, // Log queries for debugging
        dialectOptions: {
            connectTimeout: 10000,
        },
    }
);

// Test the connection - only connect when explicitly called, not at module load
// This prevents database connection during Netlify build
const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected successfully.');

        // Sync models (optional: only if you want to sync)
        // Only sync in runtime, not during build
        if (process.env.NETLIFY !== 'true' && process.env.NODE_ENV !== 'build') {
            await sequelize.sync();
            console.log('✅ Models synced successfully.');
        }

    } catch (error) {
        console.error('❌ Unable to connect to the database:', error.message);
    }
};

// Export connectDB function
sequelize.connectDB = connectDB;

// Export sequelize instance (default export for models)
module.exports = sequelize;
