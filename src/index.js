const express = require('express');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/subjectRoutes');
const catalogueRoutes = require('./routes/catalogueRoutes'); 
const worksheetRoutes = require('./routes/worksheetRoutes');
const answerSheetRoutes = require('./routes/answerSheetRoutes');

dotenv.config();

const app = express();
app.use(express.json());

// Use the auth routes
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/catalogue', catalogueRoutes);
app.use('/worksheets', worksheetRoutes);
app.use('/answersheets', answerSheetRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
