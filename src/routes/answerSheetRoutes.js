 
const express = require('express');
const router = express.Router();
const { addAnswerSheet, getAllAnswerSheets, deleteAnswerSheet } = require('../controllers/answerSheetController');

// Add Answer Sheet
router.post('/add', addAnswerSheet);

// Get All Answer Sheets
router.get('/', getAllAnswerSheets);

// Delete Answer Sheet
router.delete('/:id', deleteAnswerSheet);

module.exports = router;
