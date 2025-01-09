 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Sign Up
exports.signup = async (req, res) => {
    try {
        const { name, email, phone_number, username, password } = req.body;

        // Validate required fields
        if (!name || !email || !phone_number || !username || !password) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        // Check if email or username already exists
        const existingUser = await User.findOne({ where: { email } });
        const existingUsername = await User.findOne({ where: { username } });

        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use.' });
        }
        if (existingUsername) {
            return res.status(400).json({ error: 'Username already in use.' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Static OTP for now
        const otp = '1234';

        // Create a new user
        const user = await User.create({
            name,
            email,
            phone_number,
            username,
            password: hashedPassword,
            otp,
        });

        res.status(201).json({ message: 'User created successfully. Please verify OTP.', userId: user.id });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error.', details: err.message });
    }
};
// Verify OTP
exports.verifyOtp = async (req, res) => {
    try {
        const { username, otp } = req.body;
        
        // Validate input
        if (!username || !otp) {
            return res.status(400).json({ message: 'Username and OTP are required.' });
        }

        const user = await User.findOne({ where: { username } });

        // Check if user exists and OTP matches
        if (user && user.otp === otp) {
            user.otp = null; // Clear OTP after verification
            await user.save();
            res.json({ message: 'OTP verified successfully.' });
        } else {
            res.status(400).json({ message: 'Invalid OTP.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// Forgot Password
exports.forgotPassword = async (req, res) => {
    try {
        const { email, phone_number } = req.body;
        const user = await User.findOne({ where: { [Op.or]: [{ email }, { phone_number }] } });
        if (user) {
            user.otp = '1234'; // Static OTP for now
            await user.save();
            res.json({ message: 'OTP sent for password reset.' });
        } else {
            res.status(404).json({ message: 'User not found.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Change Password
exports.changePassword = async (req, res) => {
    try {
        const { username, newPassword } = req.body;
        const user = await User.findOne({ where: { username } });
        if (user) {
            user.password = await bcrypt.hash(newPassword, 10);
            await user.save();
            res.json({ message: 'Password changed successfully.' });
        } else {
            res.status(404).json({ message: 'User not found.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
