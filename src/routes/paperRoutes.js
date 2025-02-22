const express = require('express');
const router = express.Router();
const paperController = require('../controllers/paperController');

// Route to add a paper
router.post('/', paperController.addPaper);

// Route to get all papers
router.get('/', paperController.getAllPapers);

// Route to get papers by user ID
router.get('/user/:user_id', paperController.getPapersByUserId);

module.exports = router;
