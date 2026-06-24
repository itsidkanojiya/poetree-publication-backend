const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');  // Assuming this is the path to your multer config
const { addAnswerSheet, getAllAnswerSheets, deleteAnswerSheet, bulkDeleteAnswerSheets } = require('../controllers/answerSheetController');

// Add Answer Sheet (with file upload handling)
router.post('/add', upload.fields([
  { name: 'answersheet_url', maxCount: 1 },
  { name: 'answersheet_coverlink', maxCount: 1 }
]), addAnswerSheet);

// Get All Answer Sheets
router.get('/', getAllAnswerSheets);
  
// Bulk Delete Answer Sheets
router.post('/bulk-delete', bulkDeleteAnswerSheets);

// Delete Answer Sheet
router.delete('/:id', deleteAnswerSheet);

module.exports = router;
