const express = require('express');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const catalogueRoutes = require('./routes/catalogueRoutes'); 
const worksheetRoutes = require('./routes/worksheetRoutes');
const answerSheetRoutes = require('./routes/answerSheetRoutes');
const headerRoutes = require('./routes/headerRoutes');
dotenv.config();
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
// Use the auth routes
app.use('/auth', authRoutes);
app.use('/api', subjectRoutes);
app.use('/catalogue', catalogueRoutes);
app.use('/worksheets', worksheetRoutes);
app.use('/answersheets', answerSheetRoutes);
app.use('/headers', headerRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
})
