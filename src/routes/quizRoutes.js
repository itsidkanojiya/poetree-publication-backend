const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');
const {
  suggestMcq,
  getQuizWithQuestions,
  getPaperPdf,
  getAnswerKeyPdf,
  getOmrSheetPdf,
} = require('../controllers/quizController');

// All quiz routes require authentication
router.use(verifyToken);

router.get('/suggest-mcq', suggestMcq);
router.get('/:paperId/paper-pdf', getPaperPdf);
router.get('/:paperId/answer-key', getAnswerKeyPdf);
router.get('/:paperId/omr-sheet', getOmrSheetPdf);
router.get('/:paperId', getQuizWithQuestions);

module.exports = router;
