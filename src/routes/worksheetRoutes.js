 
const express = require('express');
const { addWorkSheet, getAllWorkSheets, deleteWorkSheet } = require('../controllers/worksheetController');
const router = express.Router();
const upload = require('../middlewares/upload');

router.post(
  '/add',
  upload.fields([
    { name: 'worksheet_url', maxCount: 1 },
    { name: 'worksheet_coverlink', maxCount: 1 },
  ]),
  addWorkSheet
);


// Get All Worksheets
router.get('/', getAllWorkSheets);

// Delete Worksheet
router.delete('/:id', deleteWorkSheet);

module.exports = router;
