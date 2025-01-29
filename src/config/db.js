const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database connection setup
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: console.log,  // Log queries for debugging
    dialectOptions: {
        // ssl: {
        //     rejectUnauthorized: false // Set to true if Hostinger requires SSL
        // },
        connectTimeout: 10000 // Increase timeout to 10 seconds
    }
});

// Test the connection
sequelize.authenticate()
    .then(() => {
        console.log('Database connected successfully.');
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err.message);
    });

module.exports = sequelize;
