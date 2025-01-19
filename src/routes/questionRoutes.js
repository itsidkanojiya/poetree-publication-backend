const { addQuestion, editQuestion, deleteQuestion, getQuestions } = require('../controllers/questionController'); 
const express = require('express');
const questionController = require('../controllers/questionController');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/add', upload.single('image'), questionController.addQuestion);
router.put('/edit/:id', upload.single('image'), questionController.editQuestion);
router.delete('/delete/:id', questionController.deleteQuestion);
router.get('/all', questionController.getAllQuestions);

module.exports = router;
