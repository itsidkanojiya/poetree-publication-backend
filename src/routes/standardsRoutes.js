const express = require('express');
const router = express.Router();
const standardsController = require('../controllers/standardsController');
const authMiddleware = require('../middlewares/authMiddleware');

// Public: get all standards (for dropdowns everywhere)
router.get('/', standardsController.getAllStandards);
router.get('/:id', standardsController.getStandardById);

// Admin only
router.post('/', authMiddleware.verifyAdmin, standardsController.addStandard);
router.put('/:id', authMiddleware.verifyAdmin, standardsController.editStandard);
router.delete('/:id', authMiddleware.verifyAdmin, standardsController.deleteStandard);

module.exports = router;
