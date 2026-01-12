const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Function to create a folder dynamically
const createUploadFolder = (folderPath) => {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }
};

// Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = "uploads/";

        if (req.originalUrl.includes("question")) {
            // Upload Path for Questions (based on question type)
            const type = req.body.type || req.query.type; // Ensure 'type' is available
            if (!type || !['mcq', 'short', 'long', 'blank', 'onetwo' , 'truefalse', 'passage', 'match'].includes(type)) {
                return cb(new Error('Invalid question type'), false);
            }
            uploadPath += `question/${type}`;
        } 
        else if (file.fieldname === "answersheet_url") {
          // Upload path for PDF file
          uploadPath += "answersheet/pdf";
      } else if (file.fieldname === "answersheet_coverlink") {
          // Upload path for image (cover) file
          uploadPath += "answersheet/coverlink";}
          else if (file.fieldname === "worksheet_url") {
            // Upload path for PDF file
            uploadPath += "worksheet/pdf";
        } else if (file.fieldname === "worksheet_coverlink") {
            // Upload path for image (cover) file
            uploadPath += "worksheet/coverlink";
      } else if (file.fieldname === "logo" && req.originalUrl.includes("profile")) {
            // Upload Path for User Profile Logo
            uploadPath += "papers/logo/";
      } else if (req.originalUrl.includes("papers")) {
            // Upload Path for Papers Logo
            uploadPath += "papers/logo/";
        } else {
            return cb(new Error('Invalid upload path'), false);
        }

        createUploadFolder(uploadPath);
        cb(null, uploadPath);
    },

    filename: (req, file, cb) => {
        // Generate a completely random number filename
        const randomFilename = `${Math.floor(Math.random() * 10000000000)}${path.extname(file.originalname)}`;
        cb(null, randomFilename);
    }
});

// File filter (Only allow images)
const fileFilter = (req, file, cb) => {
  if (file.fieldname === "answersheet_url" && file.mimetype === 'application/pdf') {
    cb(null, true);  // Accept only PDF for answersheet_url
  }else if (file.fieldname === "worksheet_url" && file.mimetype === 'application/pdf') {
    cb(null, true);  // Accept only PDF for answersheet_url
  }else {
    cb(null, true); 
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // Limit: 5MB for both PDF and image files
});

module.exports = upload;
