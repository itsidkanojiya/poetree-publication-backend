 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { Op } = require('sequelize');

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
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required.' });
        }

        // Check if user exists
        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Compare passwords
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: 'Login successful.',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone_number: user.phone_number,
                username: user.username,
            },
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error.', details: err.message });
    }
};
// Verify OTP
exports.verifyOtp = async (req, res) => {
    try {
        const { usernameOrPhone, otp } = req.body;

        // Validate input
        if (!usernameOrPhone || !otp) {
            return res.status(400).json({ message: 'Username or Phone Number and OTP are required.' });
        }

        // Query the database, checking both username and phone_number fields
        const user = await User.findOne({
            where: {
                [Op.or]: [{ username: usernameOrPhone }, { phone_number: usernameOrPhone }]
            }
        });

        // Check if the user exists and OTP matches
        if (user && user.otp === otp) {
          //  user.otp = null; // Clear OTP after verification
         //   await user.save();
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
            user.otp = '1234'; // Static OT P for now
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
        const { oldPassword, newPassword } = req.body;

        // Check if token exists
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided.' });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Validate old password
        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Old password is incorrect.' });
        }

        // Hash and update new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedNewPassword;
        await user.save();

        res.status(200).json({ message: 'Password updated successfully.' });
    } catch (err) {
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token.' });
        }
        res.status(500).json({ error: 'Internal server error.', details: err.message });
    }
};
