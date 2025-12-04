// Serverless function wrapper for Express app
// This allows your full Express app to run as a Netlify function
const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create Express app (same as src/index.js but without server.listen)
const app = express();
app.use(express.json());

// CORS configuration - allow all origins for now
app.use(cors({
    origin: '*', // In production, replace with your frontend domain: 'https://your-frontend.netlify.app'
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Import routes
const authRoutes = require('../../src/routes/authRoutes');
const subjectRoutes = require('../../src/routes/subjectRoutes');
const catalogueRoutes = require('../../src/routes/catalogueRoutes');
const worksheetRoutes = require('../../src/routes/worksheetRoutes');
const answerSheetRoutes = require('../../src/routes/answerSheetRoutes');
const headerRoutes = require('../../src/routes/headerRoutes');
const adminRoutes = require('../../src/routes/adminRoutes');
const paperRoutes = require('../../src/routes/paperRoutes');
const questionRoutes = require('../../src/routes/questionRoutes');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', subjectRoutes);
app.use('/api/catalogue', catalogueRoutes);
app.use('/api/worksheets', worksheetRoutes);
app.use('/api/answersheets', answerSheetRoutes);
app.use('/api/headers', headerRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/question', questionRoutes);

// Test endpoint
app.get('/test', (req, res) => {
    res.json({
        message: 'test is done',
        status: 'success',
        timestamp: new Date().toISOString()
    });
});

// Initialize database connection lazily - only when needed
// Don't load at module level to avoid mysql2 issues during function initialization
let dbInitialized = false;
const initDB = async () => {
    if (!dbInitialized) {
        try {
            const sequelize = require('../../src/config/db');
            if (sequelize.connectDB) {
                await sequelize.connectDB();
                dbInitialized = true;
            }
        } catch (error) {
            console.error('Database initialization error:', error.message);
            // Don't throw - allow function to work without DB for non-DB routes
        }
    }
};

// Initialize DB on first request (optional - can be done per-route instead)
// Uncomment if you want to initialize on function load:
// initDB();

// Export the serverless handler
module.exports.handler = serverless(app);
