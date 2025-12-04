require('dotenv').config();

// Explicitly require mysql2 before Sequelize to ensure it's available
// This is important for serverless environments like Netlify Functions
let mysql2Available = false;
try {
    require('mysql2');
    mysql2Available = true;
} catch (error) {
    console.error('❌ mysql2 package not available:', error.message);
    console.error('Please ensure mysql2 is installed: npm install mysql2');
    // Don't throw - allow module to load, but database operations will fail later
}

const { Sequelize } = require('sequelize');

// Database connection setup - lazy initialization
let sequelize = null;

const getSequelize = () => {
    if (!sequelize) {
        if (!mysql2Available) {
            throw new Error('mysql2 package is not available. Please install it: npm install mysql2');
        }
        sequelize = new Sequelize(
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
    }
    return sequelize;
};

// Test the connection - only connect when explicitly called, not at module load
// This prevents database connection during Netlify build
const connectDB = async () => {
    try {
        const db = getSequelize();
        await db.authenticate();
        console.log('✅ Database connected successfully.');

        // Sync models (optional: only if you want to sync)
        // Only sync in runtime, not during build
        if (process.env.NETLIFY !== 'true' && process.env.NODE_ENV !== 'build') {
            await db.sync();
            console.log('✅ Models synced successfully.');
        }

    } catch (error) {
        console.error('❌ Unable to connect to the database:', error.message);
    }
};

// Create a proxy that lazy-loads the sequelize instance
const sequelizeProxy = new Proxy({}, {
    get: function(target, prop) {
        if (prop === 'connectDB') {
            return connectDB;
        }
        const db = getSequelize();
        const value = db[prop];
        // If it's a function, bind it to the sequelize instance
        if (typeof value === 'function') {
            return value.bind(db);
        }
        return value;
    }
});

// Export the proxy as the default export
module.exports = sequelizeProxy;
