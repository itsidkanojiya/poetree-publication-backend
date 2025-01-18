const express = require('express');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/subjectRoutes');
const catalogueRoutes = require('./routes/catalogueRoutes');

dotenv.config();

const app = express();
app.use(express.json());

// Use the auth routes
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/catalogue', catalogueRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
