
const express = require('express');
const {addQuestion,editQuestion,deleteQuestion,getAllQuestions} = require('../controllers/questionController');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');

const router = express.Router();

router.post('/add', upload.single('image'), addQuestion);
router.put('/edit/:id',authMiddleware.verifyAdmin, editQuestion);
router.delete('/delete/:id',authMiddleware.verifyAdmin, deleteQuestion);
router.get('/all', getAllQuestions);

module.exports = router;
