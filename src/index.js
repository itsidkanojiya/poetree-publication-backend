const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const catalogueRoutes = require('./routes/catalogueRoutes'); 
const worksheetRoutes = require('./routes/worksheetRoutes');
const answerSheetRoutes = require('./routes/answerSheetRoutes');
const headerRoutes = require('./routes/headerRoutes');
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
<<<<<<< HEAD

=======
>>>>>>> bebaa6ec038ec9466e76b3d8858271412dbf734c
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
