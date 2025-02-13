const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set up storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const type = req.body.type; // Get the question type from the request body

        if (!type || !['mcq', 'short', 'long', 'blank', 'onetwo'].includes(type)) {
            return cb(new Error('Invalid question type'), false);
        }

        const uploadPath = `uploads/question/${type}`;

        // Create folder dynamically if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Generate unique filename
    },
});

// File filter (Only accept images)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// Multer upload instance
const upload = multer({ storage, fileFilter });

module.exports = upload;
