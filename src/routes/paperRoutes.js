const express = require('express');
const router = express.Router();
const paperController = require('../controllers/paperController');
const upload = require('../middlewares/upload');
const authMiddleware = require('../middlewares/authMiddleware');
const verifyToken = require('../middlewares/verifyToken');

// Route to get all papers
router.get('/', paperController.getAllPapers);

// Route to get templates (public access) - must be before /user/:user_id to avoid conflicts
router.get('/templates', paperController.getTemplates);

// Route to get template by ID (public access) - must be before /:id to avoid conflicts
router.get('/templates/:id', paperController.getPaperById);

// Route to get papers by user ID
router.get('/user/:user_id', paperController.getPapersByUserId);

// Route to get single paper by ID
router.get('/:id', paperController.getPaperById);

// Route to add a paper
router.post('/add', upload.single('logo'), paperController.addPaper);

// Route to update/edit a paper
router.put('/:id', upload.single('logo'), paperController.updatePaper);

// Route to create template (admin only)
router.post('/templates/create', authMiddleware.verifyAdmin, upload.single('logo'), paperController.createTemplate);

// Route to update template (admin only)
router.put('/templates/:id', authMiddleware.verifyAdmin, upload.single('logo'), paperController.updateTemplate);

// Route to clone template (authenticated users)
router.post('/templates/:id/clone', verifyToken, paperController.cloneTemplate);

// Route to delete papers by paper ID
router.delete('/delete/:id', paperController.deletePaper);

module.exports = router;
