const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const {
  addReadymadePaper,
  getAllReadymadePapers,
  deleteReadymadePaper,
  bulkDeleteReadymadePapers,
} = require('../controllers/readymadePaperController');

// Add Readymade Paper (PDF and/or Word file)
router.post(
  '/add',
  upload.fields([
    { name: 'paper_pdf', maxCount: 1 },
    { name: 'paper_word', maxCount: 1 },
  ]),
  addReadymadePaper
);

// Get All Readymade Papers
router.get('/', getAllReadymadePapers);

// Bulk Delete
router.post('/bulk-delete', bulkDeleteReadymadePapers);

// Delete
router.delete('/:id', deleteReadymadePaper);

module.exports = router;
