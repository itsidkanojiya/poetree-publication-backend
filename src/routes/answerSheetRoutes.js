 
const express = require('express');
const router = express.Router();
const { addAnswerSheet, getAllAnswerSheets, deleteAnswerSheet } = require('../controllers/answerSheetController');

// Add Answer Sheet
router.post('/answersheets/add', addAnswerSheet);

// Get All Answer Sheets
router.get('/answersheets', getAllAnswerSheets);

// Delete Answer Sheet
router.delete('/answersheets/:id', deleteAnswerSheet);

module.exports = router;
