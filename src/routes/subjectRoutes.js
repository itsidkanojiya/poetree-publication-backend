const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const authMiddleware = require('../middlewares/authMiddleware');

// Add routes (with admin verification)
router.post('/subject', authMiddleware.verifyAdmin, subjectController.addSubject);
router.post('/subjectTitle', authMiddleware.verifyAdmin, subjectController.addSubjectTitle);


// Edit routes (with admin verification)
router.put('/subject/:id', authMiddleware.verifyAdmin, subjectController.editSubject);
router.put('/subjectTitle/:id', authMiddleware.verifyAdmin, subjectController.editSubjectTitle);


// Delete routes (with admin verification)
router.delete('/subject/:id', authMiddleware.verifyAdmin, subjectController.deleteSubject);
router.delete('/subjectTitle/:id', authMiddleware.verifyAdmin, subjectController.deleteSubjectTitle);


// Get routes
router.get('/subjects', subjectController.getAllSubjects);
router.get('/subject/:subject_id/titles', subjectController.getSubjectTitlesBySubjectId);
router.get('/subjectTitle/:subject_title_id/classes', subjectController.getClassesBySubjectTitleId);

module.exports = router;
