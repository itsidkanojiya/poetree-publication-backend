const express = require('express');
const router = express.Router();
const paperController = require('../controllers/paperController');
const upload = require('../middlewares/upload'); 

// Route to add a paper
router.post('/add', upload.single('logo'), paperController.addPaper);

// Route to get all papers
router.get('/', paperController.getAllPapers);

// Route to get papers by user ID (must come before /:id to avoid route conflicts)
router.get('/user/:user_id', paperController.getPapersByUserId);

// Route to get single paper by ID
router.get('/:id', paperController.getPaperById);

// Route to update/edit paper by ID
router.put('/update/:id', upload.single('logo'), paperController.updatePaper);

// Route to delete papers by paper ID
router.delete('/delete/:id', paperController.deletePaper);

module.exports = router;
