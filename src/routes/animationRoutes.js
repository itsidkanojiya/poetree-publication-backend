const express = require('express');
const router = express.Router();
const animationController = require('../controllers/animationController');
const authMiddleware = require('../middlewares/authMiddleware');

// Public – no login/token required; everyone can view animations
router.get('/', animationController.getAllAnimations);
router.get('/:id', animationController.getAnimationById);

// Admin only (require token)
router.post('/', authMiddleware.verifyAdmin, animationController.addAnimation);
router.put('/:id', authMiddleware.verifyAdmin, animationController.updateAnimation);
router.delete('/:id', authMiddleware.verifyAdmin, animationController.deleteAnimation);

module.exports = router;
