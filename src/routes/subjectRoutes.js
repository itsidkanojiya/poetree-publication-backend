const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/subject', authMiddleware.verifyAdmin, subjectController.addSubject);
router.post('/subjectTitle', authMiddleware.verifyAdmin, subjectController.addSubjectTitle);
router.post('/class', authMiddleware.verifyAdmin, subjectController.addClass);

router.put('/subject/:id', authMiddleware.verifyAdmin, subjectController.editSubject);
router.put('/subjectTitle/:id', authMiddleware.verifyAdmin, subjectController.editSubjectTitle);
router.put('/class/:id', authMiddleware.verifyAdmin, subjectController.editClass);

router.delete('/subject/:id', authMiddleware.verifyAdmin, subjectController.deleteSubject);
router.delete('/subjectTitle/:id', authMiddleware.verifyAdmin, subjectController.deleteSubjectTitle);
router.delete('/class/:id', authMiddleware.verifyAdmin, subjectController.deleteClass);

router.get('/subjects', subjectController.getAllSubjects);

module.exports = router;
