 
const express = require('express');
const { addWorksheet, getWorksheets, deleteWorksheet } = require('../controllers/worksheetController');
const router = express.Router();

// Add Worksheet
router.post('/add', addWorksheet);

// Get All Worksheets
router.get('/', getWorksheets);

// Delete Worksheet
router.delete('/:id', deleteWorksheet);

module.exports = router;
