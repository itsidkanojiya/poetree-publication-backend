const express = require('express');
const router = express.Router();
const animationController = require('../controllers/animationController');
const authMiddleware = require('../middlewares/authMiddleware');

// Public: for user-facing animation page
router.get('/', animationController.getAllAnimations);
router.get('/:id', animationController.getAnimationById);

// Admin only
router.post('/', authMiddleware.verifyAdmin, animationController.addAnimation);
router.put('/:id', authMiddleware.verifyAdmin, animationController.updateAnimation);
router.delete('/:id', authMiddleware.verifyAdmin, animationController.deleteAnimation);

module.exports = router;
