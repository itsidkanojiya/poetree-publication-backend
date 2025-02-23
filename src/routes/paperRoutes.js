const express = require('express');
const router = express.Router();
const paperController = require('../controllers/paperController');
const upload = require('../middlewares/upload'); 
// Route to add a paper
router.post('/add', upload.single('logo'), paperController.addPaper);

// Route to get all papers
router.get('/', paperController.getAllPapers);

// Route to get papers by user ID
router.get('/user/:user_id', paperController.getPapersByUserId);

module.exports = router;
