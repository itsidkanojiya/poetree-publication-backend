 
const express = require('express');
const { 
  signup, 
  verifyOtp, 
  forgotPassword, 
  changePassword, 
  login,
  verifyToken,
  getProfile,
  updateProfile,
  resendOTP,
  getMySelections,
  getMyPendingSelections,
  getMyApprovedSelections,
  updateMySelections,
} = require('../controllers/authController');
const verifyTokenMiddleware = require('../middlewares/verifyToken');
const upload = require('../middlewares/upload');

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOTP);
router.post('/forgot-password', forgotPassword);
router.get('/verify-token', verifyToken);

// Protected routes (require authentication)
router.post('/change-password', verifyTokenMiddleware, changePassword);
router.get('/profile', verifyTokenMiddleware, getProfile);
router.put('/profile', verifyTokenMiddleware, upload.single('logo'), updateProfile);
router.get('/my-selections', verifyTokenMiddleware, getMySelections);
router.get('/my-selections/pending', verifyTokenMiddleware, getMyPendingSelections);
router.get('/my-selections/approved', verifyTokenMiddleware, getMyApprovedSelections);
router.put('/my-selections', verifyTokenMiddleware, updateMySelections);

module.exports = router;
