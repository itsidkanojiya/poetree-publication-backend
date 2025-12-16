const express = require('express');
const router = express.Router();
const paperController = require('../controllers/paperController');
const upload = require('../middlewares/upload');
const authMiddleware = require('../middlewares/authMiddleware');
const verifyToken = require('../middlewares/verifyToken');

// Route to add a paper
router.post('/add', upload.single('logo'), paperController.addPaper);

// Route to get all papers
router.get('/', paperController.getAllPapers);

// Route to get papers by user ID (must come before /:id to avoid route conflicts)
router.get('/user/:user_id', paperController.getPapersByUserId);

// ==================== TEMPLATE/Default Paper Routes ====================

// Admin: Get all templates
router.get('/templates', authMiddleware.verifyAdmin, paperController.getTemplates);

// Admin: Get single template with questions
router.get('/templates/:id', authMiddleware.verifyAdmin, paperController.getTemplateById);

// User: Get available templates (filtered by user's approved subjects/standards)
router.get('/templates/available', verifyToken, paperController.getAvailableTemplates);

// User: View template details (read-only)
router.get('/templates/:id/view', verifyToken, paperController.viewTemplate);

// User: Customize template (create copy with question replacements)
router.post('/templates/:id/customize', verifyToken, paperController.customizeTemplate);

// User: Replace single question in customized paper
router.put('/:id/replace-question', verifyToken, paperController.replaceQuestion);

// User: Get my customized papers
router.get('/my-customized', verifyToken, paperController.getMyCustomizedPapers);

// ==================== Existing Routes ====================

// Route to get single paper by ID (must come after template routes)
router.get('/:id', paperController.getPaperById);

// Route to update/edit paper by ID
router.put('/update/:id', upload.single('logo'), paperController.updatePaper);

// Route to delete papers by paper ID
router.delete('/delete/:id', paperController.deletePaper);

module.exports = router;
