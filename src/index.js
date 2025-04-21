
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
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client', 'index.html'));
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

console.log('Serving static files from:', path.join(__dirname, '../uploads'));

// Use the auth routes
app.use('/auth', authRoutes);
app.use('/', subjectRoutes);
app.use('/catalogue', catalogueRoutes); 
app.use('/worksheets', worksheetRoutes);
app.use('/answersheets', answerSheetRoutes);
app.use('/headers', headerRoutes);
app.use('/papers', paperRoutes);
app.use('/admin',adminRoutes );
app.use('/question',questionRoutes );
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
})
