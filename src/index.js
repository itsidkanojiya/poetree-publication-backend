
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path'); // 👈 this is required
  
const authRoutes = require('./routes/authRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const catalogueRoutes = require('./routes/catalogueRoutes'); 
const worksheetRoutes = require('./routes/worksheetRoutes');
const answerSheetRoutes = require('./routes/answerSheetRoutes');
const headerRoutes = require('./routes/headerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paperRoutes = require('./routes/paperRoutes');
const questionRoutes = require('./routes/questionRoutes');
dotenv.config();
    

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '../client')));


// Static files (must be before API routes to avoid conflicts)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

console.log('Serving static files from:', path.join(__dirname, '../uploads'));

// API Routes (must be before catch-all route)
app.use('/api/auth', authRoutes);
app.use('/api', subjectRoutes);
app.use('/api/catalogue', catalogueRoutes); 
app.use('/api/worksheets', worksheetRoutes);
app.use('/api/answersheets', answerSheetRoutes);
app.use('/api/headers', headerRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/question', questionRoutes);

// Static files for client (only for non-API routes)
app.use(express.static(path.join(__dirname, '../client')));

// Catch-all route for frontend (must be last, and exclude API routes)
app.get('*', (req, res, next) => {
  // Don't serve HTML for API routes

  console.log(`[${new Date().toISOString()}] Frontend route accessed: ${req.originalUrl}`);
  res.sendFile(path.join(__dirname, '../client', 'index.html'));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
})

