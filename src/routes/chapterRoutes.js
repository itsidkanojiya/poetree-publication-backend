const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { getChaptersBySubjectTitle, createChapter, updateChapter, deleteChapter } = require('../controllers/chapterController');

router.get('/', getChaptersBySubjectTitle);
router.post('/', createChapter);
router.put('/:chapterId', authMiddleware.verifyAdmin, updateChapter);
router.delete('/:chapterId', authMiddleware.verifyAdmin, deleteChapter);

module.exports = router;
