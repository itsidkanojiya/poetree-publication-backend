const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const {
  addPaperStyle,
  getAllPaperStyles,
  deletePaperStyle,
  bulkDeletePaperStyles,
} = require('../controllers/paperStyleController');

router.post('/add', upload.fields([{ name: 'paper_style_pdf', maxCount: 1 }]), addPaperStyle);
router.get('/', getAllPaperStyles);
router.post('/bulk-delete', bulkDeletePaperStyles);
router.delete('/:id', deletePaperStyle);

module.exports = router;
