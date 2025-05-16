 
const express = require('express');
const { signup, verifyOtp, forgotPassword, changePassword , login,verifyToken,getProfile,resendOTP} = require('../controllers/authController');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOTP);
router.post('/forgot-password', forgotPassword);
router.post('/change-password', changePassword);
router.get('/verify-token', verifyToken);
// router.get('/profile', getProfile);
module.exports = router;
