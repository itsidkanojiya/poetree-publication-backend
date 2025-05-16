const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { Op } = require("sequelize");
const { Subject, SubjectTitle } = require("../models/Subjects");
const {sendOTPEmail,sendNewPasswordEmail,sendAccountActivationPendingEmail } = require("../utils/sendOTPEmail");

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString(); // e.g. 6-digit
const generateRandomPassword = () =>
  Math.random().toString(36).slice(-8);
exports.signup = async (req, res) => {
  try {
    const {
      name,
      email,
      phone_number,
      username,
      password,
      school_name,
      school_address_state,
      school_address_pincode,
      school_address_city,
      school_principal_name,
      subject,
      subject_title,
      standard: userstandards,
    } = req.body;

    const existingUser = await User.findOne({
      where: { [Op.or]: [{ email }, { username }] },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Email or Username already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();

    const newUser = await User.create({
      name,
      email,
      phone_number,
      username,
      password: hashedPassword,
      user_type: "user",
      school_name,
      school_address_state,
      school_address_pincode,
      school_address_city,
      school_principal_name,
      subject,
      subject_title,
      standard: userstandards,
      otp,
    });

    const subjectData = await Subject.findOne({
      where: { subject_id: newUser.subject },
      attributes: ["subject_name"],
    });

    const subjectTitleData = await SubjectTitle.findOne({
      where: { subject_title_id: newUser.subject_title },
      attributes: ["title_name"],
    });

    const createdUserWithSubject = await User.findOne({
      where: { id: newUser.id },
      include: [{ model: Subject, attributes: ["subject_id", "subject_name"] }],
    });

    // ✅ Send OTP Email
    await sendOTPEmail(email, otp);

    res.status(201).json({
      message: "Signup successful. OTP sent to email.",
      token: generateToken(newUser),
      user: {
        createdUserWithSubject,
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone_number: newUser.phone_number,
        username: newUser.username,
        user_type: newUser.user_type,
        school_name: newUser.school_name,
        school_address_state: newUser.school_address_state,
        school_address_pincode: newUser.school_address_pincode,
        school_address_city: newUser.school_address_city,
        school_principal_name: newUser.school_principal_name,
        subject: subjectData?.subject_name,
        subject_title: subjectTitleData?.title_name,
        standard: newUser.standard,
        is_verified: newUser.is_verified,
        is_number_verified: newUser.is_number_verified,
      },
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};



exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    
    // Validate input
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required." });
    }

    // Check if user exists
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const subjectData = await Subject.findOne({
      where: { subject_id: user.subject },
      attributes: ["subject_name"],
    });

    const subjectTitleData = await SubjectTitle.findOne({
      where: { subject_title_id: user.subject_title },
      attributes: ["title_name"],
    });

    // Generate JWT
    const token = generateToken(user);

    // Response with token and user details
    res.status(200).json({
  message: "Login successful",
  token,
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    phone_number: user.phone_number,
    username: user.username,
    user_type: user.user_type,
    school_name: user.school_name,
    school_address_state: user.school_address_state,
    school_address_pincode: user.school_address_pincode,
    school_address_city: user.school_address_city,
    school_principal_name: user.school_principal_name,
    subject: subjectData ? subjectData.subject_name : null,
    subject_title: subjectTitleData ? subjectTitleData.title_name : null,
    standard: user.standard,
    is_verified: user.is_verified,
    is_number_verified: user.is_number_verified,
  },
});

  } catch (err) {
    res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};
// Helper function to generate JWT token
const generateToken = (user) => {
  const payload = {
    id: user.id,
    username: user.username,
    user_type: user.user_type,
  };

  return jwt.sign(payload, process.env.JWT_SECRET || "default_secret", {
    expiresIn: "1h",
  });
};

// Verify OTP
exports.verifyToken = async (req, res) => {
  try {
    const token = req.headers["authorization"];

    if (!token) {
      return res
        .status(401)
        .json({ error: "Access denied. No token provided." });
    }

    const formattedToken = token.startsWith("Bearer ") ? token.slice(7) : token;

    jwt.verify(
      formattedToken,
      process.env.JWT_SECRET || "default_secret",
      async (err, decoded) => {
        if (err) {
          return res.status(401).json({ error: "Invalid token." });
        }

        const user = await User.findOne({
          where: { id: decoded.id },
          attributes: { exclude: ["password"] },
        });

        if (!user) {
          return res.status(404).json({ error: "User not found." });
        }

        // ✅ Send Email
        await sendAccountActivationPendingEmail(user.email, user.name);

        res.status(200).json({
          message: "Token verified successfully. An email has been sent about account activation.",
          user,
        });
      }
    );
  } catch (err) {
    res
      .status(500)
      .json({ error: "Internal server error.", details: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email, phone_number } = req.body;

    const user = await User.findOne({
      where: { [Op.or]: [{ email }, { phone_number }] },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const newPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // Send new password on email
    await sendNewPasswordEmail(
      user.email,
      newPassword,
    );

    res.json({
      message: "A new password has been sent to your email.",
    });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // Check if token exists
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided." });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Validate old password
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Old password is incorrect." });
    }

    // Hash and update new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully." });
  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token." });
    }
    res
      .status(500)
      .json({ error: "Internal server error.", details: err.message });
  }
};

exports.verifyToken = async (req, res) => {
  try {
    const token = req.headers["authorization"];

    if (!token) {
      return res
        .status(401)
        .json({ error: "Access denied. No token provided." });
    }

    const formattedToken = token.startsWith("Bearer ") ? token.slice(7) : token;

    jwt.verify(
      formattedToken,
      process.env.JWT_SECRET || "default_secret",
      async (err, decoded) => {
        if (err) {
          return res.status(401).json({ error: "Invalid token." });
        }

        // Fetch full user details from the database using decoded ID
        const user = await User.findOne({
          where: { id: decoded.id }, // Assuming your User model has an 'id' field
          attributes: { exclude: ["password"] }, // Exclude password for security
        });

        if (!user) {
          return res.status(404).json({ error: "User not found." });
        }

        res.status(200).json({
          message: "Token verified successfully.",
          user,
        });
      }
    );
  } catch (err) {
    res
      .status(500)
      .json({ error: "Internal server error.", details: err.message });
  }
};
