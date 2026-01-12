const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { Op } = require("sequelize");
const { Subject, SubjectTitle } = require("../models/Subjects");
const UserSubject = require("../models/UserSubject");
const UserSubjectTitle = require("../models/UserSubjectTitle");
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
      // New: Accept arrays for multiple selections
      subjects, // Array of subject IDs: [1, 2, 3]
      subject_titles, // Array of objects: [{subject_id: 1, subject_title_id: 5}, {subject_id: 2, subject_title_id: 10}]
      // Keep old fields for backward compatibility (optional)
      subject,
      subject_title,
    } = req.body;

    // Check for existing user with same email, username, or phone_number
    const existingUser = await User.findOne({
      where: { 
        [Op.or]: [
          { email }, 
          { username },
          { phone_number }
        ] 
      },
    });

    if (existingUser) {
      let errorMessage = "User already exists. ";
      if (existingUser.email === email) {
        errorMessage += "Email already registered.";
      } else if (existingUser.username === username) {
        errorMessage += "Username already taken.";
      } else if (existingUser.phone_number === phone_number) {
        errorMessage += "Phone number already registered.";
      }
      return res
        .status(400)
        .json({ 
          message: errorMessage,
          error: "DUPLICATE_ENTRY"
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();

    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    const lastOtpSentAt = new Date(); // current timestamp

    // Create user without subject/subject_title/standard (will be NULL initially)
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
      // Don't set subject/subject_title here - they'll be updated when admin approves
      subject: null,
      subject_title: null,
      otp,
      otp_expiry: otpExpiry,
      last_otp_sent_at: lastOtpSentAt,
      is_verified: 0, // User not verified until admin approves
    });

    // Create records in junction tables with status='pending'
    // Handle subjects array
    if (subjects && Array.isArray(subjects) && subjects.length > 0) {
      const subjectRecords = subjects.map(subjectId => ({
        user_id: newUser.id,
        subject_id: subjectId,
        status: 'pending',
      }));
      await UserSubject.bulkCreate(subjectRecords);
    }

    // Handle subject_titles array
    if (subject_titles && Array.isArray(subject_titles) && subject_titles.length > 0) {
      const subjectTitleRecords = subject_titles.map(item => ({
        user_id: newUser.id,
        subject_id: item.subject_id,
        subject_title_id: item.subject_title_id,
        status: 'pending',
      }));
      await UserSubjectTitle.bulkCreate(subjectTitleRecords);
    }

    // Backward compatibility: If old format is used, create single records
    if (subject && !subjects) {
      await UserSubject.create({
        user_id: newUser.id,
        subject_id: subject,
        status: 'pending',
      });
    }

    if (subject_title && !subject_titles) {
      // Need subject_id for subject_title, use the subject from above or require it
      if (subject) {
        await UserSubjectTitle.create({
          user_id: newUser.id,
          subject_id: subject,
          subject_title_id: subject_title,
          status: 'pending',
        });
      }
    }

    // ✅ Send OTP Email (non-blocking - don't fail signup if email fails)
    let emailSent = false;
    try {
      await sendOTPEmail(email, otp);
      emailSent = true;
    } catch (emailError) {
      console.error("Error sending OTP email:", emailError.message);
      // Continue with signup even if email fails
      emailSent = false;
    }

    // ✅ Reload user from database to ensure all fields are properly set
    // This ensures the user object is fully committed and all fields are accessible
    await newUser.reload();

    // ✅ Generate token after reload to ensure user data is complete
    const token = generateToken(newUser);

    // ✅ Log token generation for debugging
    console.log('[signup] Token generated for user:', {
      id: newUser.id,
      username: newUser.username,
      user_type: newUser.user_type,
      tokenLength: token.length
    });

    const message = emailSent 
      ? "Signup successful. OTP sent to email. Your selections are pending admin approval."
      : "Signup successful. OTP email could not be sent. Please contact support. Your selections are pending admin approval.";

    res.status(201).json({
      message,
      token,
      user: {
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
        subject: null, // Will be updated after admin approval
        subject_title: null, // Will be updated after admin approval
        is_verified: newUser.is_verified,
        is_number_verified: newUser.is_number_verified,
      },
      email_sent: emailSent,
      otp: emailSent ? undefined : otp, // Include OTP in response if email failed (for testing)
    });
  } catch (error) {
    console.error("Error registering user:", error);
    
    // Handle Sequelize unique constraint errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0]?.path || 'field';
      let message = '';
      
      if (field === 'email') {
        message = 'Email already registered. Please use a different email.';
      } else if (field === 'username') {
        message = 'Username already taken. Please choose a different username.';
      } else if (field === 'phone_number') {
        message = 'Phone number already registered. Please use a different phone number.';
      } else {
        message = `${field} already exists. Please use a different value.`;
      }
      
      return res.status(400).json({ 
        message,
        error: 'DUPLICATE_ENTRY',
        field: field
      });
    }
    
    // Handle Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => err.message).join(', ');
      return res.status(400).json({ 
        message: `Validation error: ${validationErrors}`,
        error: 'VALIDATION_ERROR',
        details: error.errors
      });
    }
    
    // Handle database connection errors
    if (error.name === 'SequelizeConnectionError') {
      return res.status(503).json({ 
        message: 'Database connection error. Please try again later.',
        error: 'DATABASE_ERROR'
      });
    }
    
    // Generic error handler
    res.status(500).json({ 
      message: "Internal server error. Please try again later.",
      error: "INTERNAL_SERVER_ERROR"
    });
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

    // Handle JSON arrays for subjects and subject_titles
    let subjectNames = null;
    let subjectTitleNames = null;

    if (user.subject) {
      try {
        const subjectIds = typeof user.subject === 'string' ? JSON.parse(user.subject) : user.subject;
        if (Array.isArray(subjectIds) && subjectIds.length > 0) {
          const subjects = await Subject.findAll({
            where: { subject_id: { [Op.in]: subjectIds } },
            attributes: ["subject_id", "subject_name"],
          });
          subjectNames = subjects.map(s => s.subject_name);
        } else if (typeof subjectIds === 'number') {
          // Backward compatibility: single subject ID
          const subjectData = await Subject.findOne({
            where: { subject_id: subjectIds },
            attributes: ["subject_name"],
          });
          subjectNames = subjectData ? [subjectData.subject_name] : null;
        }
      } catch (e) {
        // If parsing fails, try as single integer
        const subjectData = await Subject.findOne({
          where: { subject_id: user.subject },
          attributes: ["subject_name"],
        });
        subjectNames = subjectData ? [subjectData.subject_name] : null;
      }
    }

    if (user.subject_title) {
      try {
        const titleIds = typeof user.subject_title === 'string' ? JSON.parse(user.subject_title) : user.subject_title;
        if (Array.isArray(titleIds) && titleIds.length > 0) {
          const titles = await SubjectTitle.findAll({
            where: { subject_title_id: { [Op.in]: titleIds } },
            attributes: ["subject_title_id", "title_name"],
          });
          subjectTitleNames = titles.map(t => t.title_name);
        } else if (typeof titleIds === 'number') {
          // Backward compatibility: single title ID
          const titleData = await SubjectTitle.findOne({
            where: { subject_title_id: titleIds },
            attributes: ["title_name"],
          });
          subjectTitleNames = titleData ? [titleData.title_name] : null;
        }
      } catch (e) {
        // If parsing fails, try as single integer
        const titleData = await SubjectTitle.findOne({
          where: { subject_title_id: user.subject_title },
          attributes: ["title_name"],
        });
        subjectTitleNames = titleData ? [titleData.title_name] : null;
      }
    }

    // Generate JWT
    const token = generateToken(user);

    // Generate base URL for logo
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const logoUrl = user.logo && !user.logo.startsWith('http') 
      ? `${baseUrl}/${user.logo}` 
      : (user.logo || user.logo_url || null);

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
        address: user.address, // New field
        logo: logoUrl, // New field
        school_principal_name: user.school_principal_name,
        subject: subjectNames, // Array of subject names or null
        subject_title: subjectTitleNames, // Array of title names or null
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
  // Convert Sequelize instance to plain object if needed
  // This ensures we get the actual values, not Sequelize getters
  const userData = user.get ? user.get({ plain: true }) : user;
  
  // Ensure we have a valid user object with required fields
  if (!userData || !userData.id || !userData.username || !userData.user_type) {
    console.error('[generateToken] Invalid user object:', {
      hasUser: !!userData,
      hasId: !!userData?.id,
      hasUsername: !!userData?.username,
      hasUserType: !!userData?.user_type,
      userKeys: userData ? Object.keys(userData) : 'null',
      isSequelizeInstance: !!user?.get
    });
    throw new Error('Invalid user object for token generation');
  }

  const payload = {
    id: Number(userData.id), // Ensure it's a number
    username: String(userData.username), // Ensure it's a string
    user_type: String(userData.user_type), // Ensure it's a string
  };

  const SECRET_KEY = process.env.JWT_SECRET || "default_secret";
  
  console.log('[generateToken] Generating token with payload:', {
    id: payload.id,
    username: payload.username,
    user_type: payload.user_type,
    idType: typeof payload.id,
    secretKey: SECRET_KEY === process.env.JWT_SECRET ? 'from env' : 'default'
  });

  const token = jwt.sign(payload, SECRET_KEY, {
    expiresIn: "30d",
  });

  console.log('[generateToken] Token generated successfully, length:', token.length);
  
  return token;
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

    const SECRET_KEY = process.env.JWT_SECRET || "default_secret"; // Must match token generation
    jwt.verify(
      formattedToken,
      SECRET_KEY,
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
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if OTP exists
    if (!user.otp) {
      return res.status(400).json({ error: "OTP not found. Please request a new OTP." });
    }

    // Check if OTP is expired (check before comparing OTP)
    if (user.otp_expiry && new Date() > new Date(user.otp_expiry)) {
      return res.status(400).json({ error: "OTP has expired. Please request a new OTP." });
    }

    // Check if OTP is correct (compare as strings to handle number/string differences)
    if (String(user.otp).trim() !== String(otp).trim()) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // ✅ Mark user as verified
    user.is_number_verified = 1;
    user.otp = null;
    user.otp_expiry = null;

    await user.save({
      fields: ["is_number_verified", "otp", "otp_expiry"]
    });

    // Optional: send success email (non-blocking - don't fail verification if email fails)
    let emailSent = false;
    try {
      await sendAccountActivationPendingEmail(user.email, user.name);
      emailSent = true;
    } catch (emailError) {
      console.error("Error sending activation email:", emailError.message);
      // Continue even if email fails
      emailSent = false;
    }

    // Generate base URL for logo
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const logoUrl = user.logo && !user.logo.startsWith('http') 
      ? `${baseUrl}/${user.logo}` 
      : (user.logo || user.logo_url || null);

    // Return user data without password and OTP
    const userResponse = {
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
      address: user.address, // New field
      logo: logoUrl, // New field
      school_principal_name: user.school_principal_name,
      is_verified: user.is_verified,
      is_number_verified: user.is_number_verified,
    };

    res.status(200).json({
      message: "OTP verified successfully",
      user: userResponse,
      email_sent: emailSent
    });
  } catch (err) {
    console.error("Error in verifyOtp:", err);
    
    // Handle Sequelize validation errors
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: "Validation error",
        message: err.errors.map(e => e.message).join(', ')
      });
    }
    
    // Handle database errors
    if (err.name === 'SequelizeDatabaseError' || err.name === 'SequelizeConnectionError') {
      return res.status(503).json({ 
        error: "Database error",
        message: "Unable to verify OTP. Please try again later."
      });
    }
    
    res.status(500).json({ 
      error: "Internal server error",
      message: err.message 
    });
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

exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const now = new Date();

    // Check if 30 seconds have passed since the last OTP was sent
    if (user.last_otp_sent_at && (now - new Date(user.last_otp_sent_at)) < 30 * 1000) {
      const secondsLeft = 30 - Math.floor((now - new Date(user.last_otp_sent_at)) / 1000);
      return res.status(429).json({
        message: `Please wait ${secondsLeft} second(s) before requesting a new OTP.`
      });
    }

    const newOTP = generateOTP();
    const otpExpiry = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes expiry

    // Update user with new OTP and timestamps
    user.otp = newOTP;
    // user.otp_expiry = otpExpiry;
    // user.last_otp_sent_at = now;
    await user.save();

    // Send the OTP via email
    await sendOTPEmail(user.email, newOTP);

    res.status(200).json({
      message: "OTP resent successfully.",
      otp_sent_at: now,
      expires_in: "5 minutes"
    });

  } catch (err) {
    console.error("Error resending OTP:", err);
    res.status(500).json({ message: "Internal server error." });
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
    const SECRET_KEY = process.env.JWT_SECRET || "default_secret"; // Must match token generation
    const decoded = jwt.verify(token, SECRET_KEY);
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

// Get user's all selections (pending + approved + rejected)
exports.getMySelections = async (req, res) => {
  try {
    const userId = req.user.id; // From middleware

    const [subjects, subjectTitles] = await Promise.all([
      UserSubject.findAll({
        where: { user_id: userId },
        include: [{ model: Subject, as: "subject", attributes: ["subject_id", "subject_name"] }],
        order: [["created_at", "DESC"]],
      }),
      UserSubjectTitle.findAll({
        where: { user_id: userId },
        include: [
          { model: Subject, as: "subject", attributes: ["subject_id", "subject_name"] },
          { model: SubjectTitle, as: "subjectTitle", attributes: ["subject_title_id", "title_name"] },
        ],
        order: [["created_at", "DESC"]],
      }),
    ]);

    res.status(200).json({
      selections: {
        subjects: {
          pending: subjects.filter(s => s.status === "pending"),
          approved: subjects.filter(s => s.status === "approved"),
          rejected: subjects.filter(s => s.status === "rejected"),
          all: subjects,
        },
        subject_titles: {
          pending: subjectTitles.filter(st => st.status === "pending"),
          approved: subjectTitles.filter(st => st.status === "approved"),
          rejected: subjectTitles.filter(st => st.status === "rejected"),
          all: subjectTitles,
        },
      },
    });
  } catch (err) {
    console.error("Error getting user selections:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get user's pending selections only
exports.getMyPendingSelections = async (req, res) => {
  try {
    const userId = req.user.id;

    const [subjects, subjectTitles] = await Promise.all([
      UserSubject.findAll({
        where: { user_id: userId, status: "pending" },
        include: [{ model: Subject, as: "subject", attributes: ["subject_id", "subject_name"] }],
        order: [["created_at", "DESC"]],
      }),
      UserSubjectTitle.findAll({
        where: { user_id: userId, status: "pending" },
        include: [
          { model: Subject, as: "subject", attributes: ["subject_id", "subject_name"] },
          { model: SubjectTitle, as: "subjectTitle", attributes: ["subject_title_id", "title_name"] },
        ],
        order: [["created_at", "DESC"]],
      }),
    ]);

    res.status(200).json({
      pending_selections: {
        subjects,
        subject_titles: subjectTitles,
      },
    });
  } catch (err) {
    console.error("Error getting pending selections:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get user's approved selections only
exports.getMyApprovedSelections = async (req, res) => {
  try {
    const userId = req.user.id;

    const [subjects, subjectTitles] = await Promise.all([
      UserSubject.findAll({
        where: { user_id: userId, status: "approved" },
        include: [{ model: Subject, as: "subject", attributes: ["subject_id", "subject_name"] }],
        order: [["approved_at", "DESC"]],
      }),
      UserSubjectTitle.findAll({
        where: { user_id: userId, status: "approved" },
        include: [
          { model: Subject, as: "subject", attributes: ["subject_id", "subject_name"] },
          { model: SubjectTitle, as: "subjectTitle", attributes: ["subject_title_id", "title_name"] },
        ],
        order: [["approved_at", "DESC"]],
      }),
    ]);

    res.status(200).json({
      approved_selections: {
        subjects,
        subject_titles: subjectTitles,
      },
    });
  } catch (err) {
    console.error("Error getting approved selections:", err);
    res.status(500).json({ error: err.message });
  }
};

// Update/Add new selections (creates new pending requests)
exports.updateMySelections = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      subjects, // Array of subject IDs: [1, 2, 3]
      subject_titles, // Array of objects: [{subject_id: 1, subject_title_id: 5}]
    } = req.body;

    // Add new subjects (only if they don't already exist)
    if (subjects && Array.isArray(subjects) && subjects.length > 0) {
      for (const subjectId of subjects) {
        const existing = await UserSubject.findOne({
          where: { user_id: userId, subject_id: subjectId },
        });
        if (!existing) {
          await UserSubject.create({
            user_id: userId,
            subject_id: subjectId,
            status: 'pending',
          });
        }
      }
    }

    // Add new subject titles
    if (subject_titles && Array.isArray(subject_titles) && subject_titles.length > 0) {
      for (const item of subject_titles) {
        const existing = await UserSubjectTitle.findOne({
          where: { user_id: userId, subject_title_id: item.subject_title_id },
        });
        if (!existing) {
          await UserSubjectTitle.create({
            user_id: userId,
            subject_id: item.subject_id,
            subject_title_id: item.subject_title_id,
            status: 'pending',
          });
        }
      }
    }

    res.status(200).json({
      message: "New selections added successfully. They are pending admin approval.",
    });
  } catch (err) {
    console.error("Error updating selections:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get User Profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized. Please login." });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Generate base URL for logo
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const logoUrl = user.logo && !user.logo.startsWith('http') 
      ? `${baseUrl}/${user.logo}` 
      : (user.logo || user.logo_url || null);

    const userResponse = {
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
      address: user.address,
      logo: logoUrl,
      school_principal_name: user.school_principal_name,
      is_verified: user.is_verified,
      is_number_verified: user.is_number_verified,
    };

    res.status(200).json({ success: true, user: userResponse });
  } catch (err) {
    console.error("Error getting profile:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

// Update User Profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized. Please login." });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const {
      name,
      school_name,
      school_address_state,
      school_address_pincode,
      school_address_city,
      address,
      school_principal_name,
      logo_url,
    } = req.body;

    // Handle logo: prioritize file upload, then URL, then keep existing
    let logoPath = user.logo; // Keep existing logo by default
    if (req.file) {
      logoPath = `uploads/papers/logo/${req.file.filename}`;
    } else if (logo_url && logo_url.trim() !== '') {
      logoPath = logo_url.trim();
    }

    // Update only provided fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (school_name !== undefined) updateData.school_name = school_name;
    if (school_address_state !== undefined) updateData.school_address_state = school_address_state;
    if (school_address_pincode !== undefined) updateData.school_address_pincode = school_address_pincode;
    if (school_address_city !== undefined) updateData.school_address_city = school_address_city;
    if (address !== undefined) updateData.address = address;
    if (school_principal_name !== undefined) updateData.school_principal_name = school_principal_name;
    if (req.file || logo_url !== undefined) {
      updateData.logo = logoPath;
      if (logo_url !== undefined) updateData.logo_url = logo_url && logo_url.trim() !== '' ? logo_url.trim() : null;
    }

    await user.update(updateData);

    // Generate base URL for logo
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const logoUrl = user.logo && !user.logo.startsWith('http') 
      ? `${baseUrl}/${user.logo}` 
      : (user.logo || user.logo_url || null);

    const userResponse = {
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
      address: user.address,
      logo: logoUrl,
      school_principal_name: user.school_principal_name,
      is_verified: user.is_verified,
      is_number_verified: user.is_number_verified,
    };

    res.status(200).json({ 
      success: true, 
      message: "Profile updated successfully", 
      user: userResponse 
    });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
};
