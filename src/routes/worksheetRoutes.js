 
const express = require('express');
const { addWorkSheet, getAllWorkSheets, deleteWorkSheet } = require('../controllers/worksheetController');
const router = express.Router();

// Add Worksheet
router.post('/add', addWorkSheet);

// Get All Worksheets
router.get('/', getAllWorkSheets);

// Delete Worksheet
router.delete('/:id', deleteWorkSheet);

module.exports = router;
