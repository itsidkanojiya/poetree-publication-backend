 
const express = require('express');
const { signup, verifyOtp, forgotPassword, changePassword , login} = require('../controllers/authController');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/verify-otp', verifyOtp);
router.post('/forgot-password', forgotPassword);
router.post('/change-password', changePassword);

module.exports = router;
