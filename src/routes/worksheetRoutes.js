 
const express = require('express');
const { addWorksheet, getWorksheets, deleteWorksheet } = require('../controllers/worksheetController');
const router = express.Router();

// Add Worksheet
router.post('/worksheets/add', addWorksheet);

// Get All Worksheets
router.get('/worksheets', getWorksheets);

// Delete Worksheet
router.delete('/worksheets/:id', deleteWorksheet);

module.exports = router;
