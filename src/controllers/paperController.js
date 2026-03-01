const Paper = require('../models/Paper'); // Adjust path if needed
const User = require('../models/User');
const { SubjectTitle } = require('../models/Subjects');
const Header = require('../models/Header');
const { Op } = require('sequelize');
const path = require("path");
const fs = require("fs");

// Define associations
Paper.belongsTo(SubjectTitle, { 
    foreignKey: 'subject_title_id', 
    as: 'subjectTitle'
});
Paper.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
});

const allowedTypes = ["custom", "default"];

exports.addPaper = async (req, res) => {
    try {
        let { 
            user_id, 
            type, 
            standard, 
            timing, 
            date, 
            division, 
            subject, 
            subject_title_id,
            board, 
            paper_title,
            body,
            student_name,
            roll_number,
            marks_mcq,
            marks_short,
            marks_long,
            marks_blank,
            marks_onetwo,
            marks_truefalse
        } = req.body;

        // Normalize paper_title: ensure it's a string (multipart/form-data or passage flows may send array/object)
        if (Array.isArray(paper_title)) {
            paper_title = paper_title.length > 0 ? String(paper_title[0]) : null;
        } else if (paper_title !== undefined && paper_title !== null && typeof paper_title === 'object') {
            paper_title = typeof paper_title.title === 'string' ? paper_title.title : JSON.stringify(paper_title);
        } else if (paper_title !== undefined && paper_title !== null) {
            paper_title = String(paper_title);
        } else {
            paper_title = null;
        }

        // Normalize body: ensure it's a string (passage/JSON may send array or object)
        if (body !== undefined && body !== null) {
            body = typeof body === 'string' ? body : JSON.stringify(body);
        }

        // Validate required fields
        if (!user_id || !type || !standard || !date || !subject || !board || !body) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // Validate type
        if (!allowedTypes.includes(type.toLowerCase())) {
            return res.status(400).json({ success: false, message: "Invalid paper type. Allowed values: 'custom', 'default'." });
        }

        // Fetch user to get school_name, address, and logo
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Get school_name, address, and logo from user
        const school_name = user.school_name || null;
        const address = user.address || null;
        // Get logo from user - prioritize logo, then logo_url, then default
        let logo = "/uploads/1739360660741.JPG"; // Default logo
        if (user.logo) {
            logo = user.logo;
        } else if (user.logo_url) {
            logo = user.logo_url;
        }

        // Calculate total marks
        const marksMcq = parseInt(marks_mcq) || 0;
        const marksShort = parseInt(marks_short) || 0;
        const marksLong = parseInt(marks_long) || 0;
        const marksBlank = parseInt(marks_blank) || 0;
        const marksOnetwo = parseInt(marks_onetwo) || 0;
        const marksTruefalse = parseInt(marks_truefalse) || 0;
        const totalMarks = marksMcq + marksShort + marksLong + marksBlank + marksOnetwo + marksTruefalse;

        // Create paper entry (school_name, address, logo are now nullable and stored for backward compatibility)
        const paper = await Paper.create({
            user_id,
            type,
            school_name, // From user table
            standard,
            timing: timing || null,
            date,
            division: division || null,
            address, // From user table
            subject,
            subject_title_id: subject_title_id ? parseInt(subject_title_id) : null,
            logo, // From user table
            logo_url: null, // Not used anymore
            board,
            paper_title: paper_title || null, // For templates
            body,
            marks_mcq: marksMcq,
            marks_short: marksShort,
            marks_long: marksLong,
            marks_blank: marksBlank,
            marks_onetwo: marksOnetwo,
            marks_truefalse: marksTruefalse,
            total_marks: totalMarks
        });

        return res.status(201).json({ success: true, message: "Paper added successfully", data: paper });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error adding paper", error: error.message });
    }
};


// Get all papers
exports.getAllPapers = async (req, res) => {
    try {
        const baseUrl = `${req.protocol}://${req.get('host')}`; // Example: http://localhost:5000

        const papers = await Paper.findAll({
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'school_name', 'address', 'logo', 'logo_url'],
                required: false
            }]
        });

        // Format the response to include full image URLs and user data
        const formattedPapers = papers.map(paper => {
            const paperData = paper.toJSON();
            const user = paperData.user;
            
            // Get school_name, address, and logo from user if available, otherwise from paper (backward compatibility)
            const school_name = user?.school_name || paperData.school_name || null;
            const address = user?.address || paperData.address || null;
            let logo = user?.logo || user?.logo_url || paperData.logo || null;
            
            // Format logo URL
            if (logo && !logo.startsWith('http')) {
                logo = `${baseUrl}/${logo}`;
            }
            
            // Remove user object from response
            const { user: _, ...rest } = paperData;
            
            return {
                ...rest,
                school_name,
                address,
                logo
            };
        });

        return res.status(200).json({ success: true, data: formattedPapers });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error fetching papers", error: error.message });
    }
};


// Get papers by user ID
exports.getPapersByUserId = async (req, res) => {
    try {
        const { user_id } = req.params;
        const { type } = req.query; // Get type from query parameters

        let whereClause = { 
            user_id,
            [Op.or]: [
                { is_template: false },
                { is_template: null }
            ]
        };

        // If type is provided, validate and add it to the filter
        if (type) {
            const allowedTypes = ["custom", "default"];
            if (!allowedTypes.includes(type.toLowerCase())) {
                return res.status(400).json({ success: false, message: "Invalid paper type. Allowed values: 'custom', 'default'." });
            }
            whereClause.type = type;
        }

        const papers = await Paper.findAll({ 
            where: whereClause,
            include: [
                {
                    model: SubjectTitle,
                    as: 'subjectTitle',
                    attributes: ['subject_title_id', 'title_name'],
                    required: false // LEFT JOIN - include papers even if subject_title_id is null
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'school_name', 'address', 'logo', 'logo_url'],
                    required: false
                }
            ]
        });

        if (papers.length === 0) {
            return res.status(404).json({ success: false, message: "No papers found for this user with the specified type" });
        }

        // Generate base URL
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        // Format response to include full image URL and subject title name
        const formattedPapers = papers.map(paper => {
            const paperData = paper.toJSON();
            const { subjectTitle, user, ...rest } = paperData;
            
            // Get school_name, address, and logo from user if available, otherwise from paper (backward compatibility)
            const school_name = user?.school_name || paperData.school_name || null;
            const address = user?.address || paperData.address || null;
            let logo = user?.logo || user?.logo_url || paperData.logo || null;
            
            // Format logo URL
            if (logo && !logo.startsWith('http')) {
                logo = `${baseUrl}/${logo}`;
            }
            
            return {
                ...rest,
                school_name,
                address,
                logo,
                subject_title_name: subjectTitle ? subjectTitle.title_name : null // Add subject title name
            };
        });

        return res.status(200).json({ success: true, papers: formattedPapers });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error fetching papers", error: error.message });
    }
};


// Update/Edit Paper
exports.updatePaper = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            user_id, 
            type, 
            paper_title,
            standard, 
            timing, 
            date, 
            division, 
            subject, 
            subject_title_id,
            board, 
            body,
            marks_mcq,
            marks_short,
            marks_long,
            marks_blank,
            marks_onetwo,
            marks_truefalse
        } = req.body;

        // Find the paper by ID
        const paper = await Paper.findByPk(id);
        if (!paper) {
            return res.status(404).json({ success: false, message: 'Paper not found' });
        }

        // Validate type if provided
        if (type && !allowedTypes.includes(type.toLowerCase())) {
            return res.status(400).json({ success: false, message: "Invalid paper type. Allowed values: 'custom', 'default'." });
        }

        // Fetch user to get school_name, address, and logo (if user_id is provided or use existing)
        const userId = user_id || paper.user_id;
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Get school_name, address, and logo from user
        const school_name = user.school_name || null;
        const address = user.address || null;
        // Get logo from user - prioritize logo, then logo_url, then default
        let logo = "/uploads/1739360660741.JPG"; // Default logo
        if (user.logo) {
            logo = user.logo;
        } else if (user.logo_url) {
            logo = user.logo_url;
        }

        // Calculate total marks if any marks are provided
        let totalMarks = paper.total_marks || 0;
        if (marks_mcq !== undefined || marks_short !== undefined || marks_long !== undefined || 
            marks_blank !== undefined || marks_onetwo !== undefined || marks_truefalse !== undefined) {
            const marksMcq = marks_mcq !== undefined ? (parseInt(marks_mcq) || 0) : (paper.marks_mcq || 0);
            const marksShort = marks_short !== undefined ? (parseInt(marks_short) || 0) : (paper.marks_short || 0);
            const marksLong = marks_long !== undefined ? (parseInt(marks_long) || 0) : (paper.marks_long || 0);
            const marksBlank = marks_blank !== undefined ? (parseInt(marks_blank) || 0) : (paper.marks_blank || 0);
            const marksOnetwo = marks_onetwo !== undefined ? (parseInt(marks_onetwo) || 0) : (paper.marks_onetwo || 0);
            const marksTruefalse = marks_truefalse !== undefined ? (parseInt(marks_truefalse) || 0) : (paper.marks_truefalse || 0);
            totalMarks = marksMcq + marksShort + marksLong + marksBlank + marksOnetwo + marksTruefalse;
        }

        // Prepare update data (only include fields that are provided)
        // Note: school_name, address, and logo are always updated from user table
        const updateData = {
            school_name, // Always from user table
            address, // Always from user table
            logo, // Always from user table
        };
        if (user_id !== undefined) updateData.user_id = user_id;
        if (type !== undefined) updateData.type = type;
        if (standard !== undefined) updateData.standard = standard;
        if (timing !== undefined) updateData.timing = timing;
        if (date !== undefined) updateData.date = date;
        if (division !== undefined) updateData.division = division;
        if (subject !== undefined) updateData.subject = subject;
        if (subject_title_id !== undefined) updateData.subject_title_id = subject_title_id ? parseInt(subject_title_id) : null;
        if (board !== undefined) updateData.board = board;
        if (paper_title !== undefined) updateData.paper_title = paper_title;
        if (body !== undefined) updateData.body = body;
        if (marks_mcq !== undefined) updateData.marks_mcq = parseInt(marks_mcq) || 0;
        if (marks_short !== undefined) updateData.marks_short = parseInt(marks_short) || 0;
        if (marks_long !== undefined) updateData.marks_long = parseInt(marks_long) || 0;
        if (marks_blank !== undefined) updateData.marks_blank = parseInt(marks_blank) || 0;
        if (marks_onetwo !== undefined) updateData.marks_onetwo = parseInt(marks_onetwo) || 0;
        if (marks_truefalse !== undefined) updateData.marks_truefalse = parseInt(marks_truefalse) || 0;
        if (marks_mcq !== undefined || marks_short !== undefined || marks_long !== undefined || 
            marks_blank !== undefined || marks_onetwo !== undefined || marks_truefalse !== undefined) {
            updateData.total_marks = totalMarks;
        }

        // Update the paper
        await paper.update(updateData);

        // Generate base URL for logo
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const updatedPaper = {
            ...paper.toJSON(),
            logo: paper.logo && !paper.logo.startsWith('http') ? `${baseUrl}/${paper.logo}` : paper.logo
        };

        return res.status(200).json({ 
            success: true, 
            message: "Paper updated successfully", 
            data: updatedPaper 
        });
    } catch (error) {
        console.error('Error updating paper:', error);
        return res.status(500).json({ success: false, message: "Error updating paper", error: error.message });
    }
};

// Get single paper by ID
exports.getPaperById = async (req, res) => {
    try {
        const { id } = req.params;
        const paper = await Paper.findByPk(id, {
            include: [
                {
                    model: SubjectTitle,
                    as: 'subjectTitle',
                    attributes: ['subject_title_id', 'title_name'],
                    required: false
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'school_name', 'address', 'logo', 'logo_url'],
                    required: false
                }
            ]
        });
        
        if (!paper) {
            return res.status(404).json({ success: false, message: 'Paper not found' });
        }

        // Generate base URL
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const paperData = paper.toJSON();
        const { subjectTitle, user, ...rest } = paperData;

        // Get school_name, address, and logo from user if available, otherwise from paper (backward compatibility)
        const school_name = user?.school_name || paperData.school_name || null;
        const address = user?.address || paperData.address || null;
        let logo = user?.logo || user?.logo_url || paperData.logo || null;
        
        // Format logo URL
        if (logo && !logo.startsWith('http')) {
            logo = `${baseUrl}/${logo}`;
        }

        // Parse template_metadata if it exists
        let parsedMetadata = null;
        if (paperData.template_metadata) {
            try {
                parsedMetadata = typeof paperData.template_metadata === 'string' 
                    ? JSON.parse(paperData.template_metadata) 
                    : paperData.template_metadata;
            } catch (error) {
                console.error('Error parsing template_metadata:', error);
                parsedMetadata = null;
            }
        }

        const formattedPaper = {
            ...rest,
            school_name,
            address,
            logo,
            subject_title_name: subjectTitle ? subjectTitle.title_name : null, // Add subject title name
            template_metadata: parsedMetadata // Add parsed template_metadata
        };

        return res.status(200).json({ success: true, data: formattedPaper });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error fetching paper", error: error.message });
    }
};

exports.deletePaper = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(id);

        // Find the paper by ID
        const paper = await Paper.findByPk(id);
        if (!paper) return res.status(404).json({ success: false, message: 'Paper not found' });

        // If the paper has a logo, delete it from the server
        if (paper.logo) {
            // Get the absolute path of the 'uploads' folder at the project root
            const rootDir = path.resolve(__dirname, '..', '..'); // Move up TWO levels from src
            const logoPath = path.join(rootDir, paper.logo);

            // Check if the file exists before deleting
            if (fs.existsSync(logoPath)) {
                fs.unlinkSync(logoPath);
                console.log(`✅ Deleted file: ${logoPath}`);
            } else {
                console.log(`❌ File not found: ${logoPath}`);
            }
        }

        // Delete the paper from the database
        await paper.destroy();
        res.status(200).json({ success: true, message: 'Paper and logo deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// Create Template (Admin Only)
exports.createTemplate = async (req, res) => {
    try {
        const { 
            user_id, 
            type, 
            school_name, 
            standard, 
            timing, 
            date, 
            division, 
            address, 
            subject, 
            subject_title_id,
            board, 
            paper_title,
            body,
            logo_url,
            marks_mcq,
            marks_short,
            marks_long,
            marks_blank,
            marks_onetwo,
            marks_truefalse,
            template_metadata
        } = req.body;

        // Validate required fields
        if (!user_id || !type || !school_name || !standard || !date || !subject || !board || !body) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // Validate type
        if (!allowedTypes.includes(type.toLowerCase())) {
            return res.status(400).json({ success: false, message: "Invalid paper type. Allowed values: 'custom', 'default'." });
        }

        // Validate template_metadata
        if (!template_metadata) {
            return res.status(400).json({ success: false, message: "template_metadata is required" });
        }

        let metadata;
        try {
            metadata = typeof template_metadata === 'string' ? JSON.parse(template_metadata) : template_metadata;
        } catch (error) {
            return res.status(400).json({ success: false, message: "Invalid template_metadata JSON format" });
        }

        // Validate header_id exists
        if (!metadata.header_id || typeof metadata.header_id !== 'number') {
            return res.status(400).json({ success: false, message: "template_metadata.header_id is required and must be a number" });
        }

        // Validate question_types if provided
        if (metadata.question_types) {
            const validQuestionTypes = ['mcq', 'short', 'long', 'blank', 'onetwo', 'truefalse'];
            const questionTypeKeys = Object.keys(metadata.question_types);
            for (const key of questionTypeKeys) {
                if (!validQuestionTypes.includes(key)) {
                    return res.status(400).json({ success: false, message: `Invalid question type: ${key}. Allowed values: ${validQuestionTypes.join(', ')}` });
                }
                if (metadata.question_types[key].custom_title && typeof metadata.question_types[key].custom_title !== 'string') {
                    return res.status(400).json({ success: false, message: `custom_title for ${key} must be a string` });
                }
            }
        }

        // Handle logo: prioritize file upload, then URL, then default
        let logo = "/uploads/1739360660741.JPG"; // Default logo
        if (req.file) {
            logo = `uploads/papers/logo/${req.file.filename}`;
        } else if (logo_url && logo_url.trim() !== '') {
            logo = logo_url.trim();
        }

        // Calculate total marks
        const marksMcq = parseInt(marks_mcq) || 0;
        const marksShort = parseInt(marks_short) || 0;
        const marksLong = parseInt(marks_long) || 0;
        const marksBlank = parseInt(marks_blank) || 0;
        const marksOnetwo = parseInt(marks_onetwo) || 0;
        const marksTruefalse = parseInt(marks_truefalse) || 0;
        const totalMarks = marksMcq + marksShort + marksLong + marksBlank + marksOnetwo + marksTruefalse;

        // Create template entry
        const template = await Paper.create({
            user_id,
            type,
            school_name,
            standard,
            timing: timing || null,
            date,
            division: division || null,
            address: address || null,
            subject,
            subject_title_id: subject_title_id ? parseInt(subject_title_id) : null,
            logo,
            logo_url: logo_url && logo_url.trim() !== '' ? logo_url.trim() : null,
            board,
            paper_title: paper_title || null, // For templates
            body,
            marks_mcq: marksMcq,
            marks_short: marksShort,
            marks_long: marksLong,
            marks_blank: marksBlank,
            marks_onetwo: marksOnetwo,
            marks_truefalse: marksTruefalse,
            total_marks: totalMarks,
            is_template: true,
            template_metadata: JSON.stringify(metadata)
        });

        return res.status(201).json({ success: true, message: "Template created successfully", data: template });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error creating template", error: error.message });
    }
};

// Get Templates (Public)
exports.getTemplates = async (req, res) => {
    try {
        const { subject, standard, board } = req.query;

        // Build where clause
        const whereClause = { is_template: true };

        if (subject) {
            whereClause.subject = subject;
        }
        if (standard) {
            whereClause.standard = parseInt(standard);
        }
        if (board) {
            whereClause.board = board;
        }

        // Debug: Log the query

        const templates = await Paper.findAll({ 
            where: whereClause,
            include: [{
                model: SubjectTitle,
                as: 'subjectTitle',
                attributes: ['subject_title_id', 'title_name'],
                required: false
            }]
        });

        // Debug: Log results
        console.log(`Found ${templates.length} templates`);

        // Generate base URL
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        // Format response to include full image URL, subject title name, and parsed metadata
        const formattedTemplates = templates.map(template => {
            const templateData = template.toJSON();
            const { subjectTitle, ...rest } = templateData;

            // Parse template_metadata if it exists
            let parsedMetadata = null;
            if (templateData.template_metadata) {
                try {
                    parsedMetadata = typeof templateData.template_metadata === 'string' 
                        ? JSON.parse(templateData.template_metadata) 
                        : templateData.template_metadata;
                } catch (error) {
                    console.error('Error parsing template_metadata:', error);
                    parsedMetadata = null;
                }
            }

            return {
                ...rest,
                logo: templateData.logo && !templateData.logo.startsWith('http') ? `${baseUrl}/${templateData.logo}` : (templateData.logo || null),
                subject_title_name: subjectTitle ? subjectTitle.title_name : null,
                template_metadata: parsedMetadata
            };
        });

        return res.status(200).json({ success: true, data: formattedTemplates });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error fetching templates", error: error.message });
    }
};

// Update Template (Admin Only)
exports.updateTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            user_id, 
            type, 
            school_name, 
            paper_title,
            standard, 
            timing, 
            date, 
            division, 
            address, 
            subject, 
            subject_title_id,
            board, 
            body,
            logo_url,
            marks_mcq,
            marks_short,
            marks_long,
            marks_blank,
            marks_onetwo,
            marks_truefalse,
            template_metadata
        } = req.body;

        // Find the template by ID
        const template = await Paper.findByPk(id);
        if (!template) {
            return res.status(404).json({ success: false, message: 'Template not found' });
        }

        if (!template.is_template) {
            return res.status(400).json({ success: false, message: 'Paper is not a template' });
        }

        // Validate type if provided
        if (type && !allowedTypes.includes(type.toLowerCase())) {
            return res.status(400).json({ success: false, message: "Invalid paper type. Allowed values: 'custom', 'default'." });
        }

        // Validate template_metadata if provided
        let metadata = null;
        if (template_metadata !== undefined) {
            try {
                metadata = typeof template_metadata === 'string' ? JSON.parse(template_metadata) : template_metadata;
            } catch (error) {
                return res.status(400).json({ success: false, message: "Invalid template_metadata JSON format" });
            }

            // Validate header_id if provided
            if (metadata.header_id !== undefined) {
                if (typeof metadata.header_id !== 'number') {
                    return res.status(400).json({ success: false, message: "template_metadata.header_id must be a number" });
                }
            }

            // Validate question_types if provided
            if (metadata.question_types) {
                const validQuestionTypes = ['mcq', 'short', 'long', 'blank', 'onetwo', 'truefalse'];
                const questionTypeKeys = Object.keys(metadata.question_types);
                for (const key of questionTypeKeys) {
                    if (!validQuestionTypes.includes(key)) {
                        return res.status(400).json({ success: false, message: `Invalid question type: ${key}. Allowed values: ${validQuestionTypes.join(', ')}` });
                    }
                    if (metadata.question_types[key].custom_title && typeof metadata.question_types[key].custom_title !== 'string') {
                        return res.status(400).json({ success: false, message: `custom_title for ${key} must be a string` });
                    }
                }
            }
        }

        // Handle logo update - prioritize file upload, then URL, then keep existing
        let logoPath = template.logo; // Keep existing logo by default
        
        if (req.file) {
            // Delete old logo if it exists and is not default
            if (template.logo && template.logo !== "/uploads/1739360660741.JPG" && !template.logo.startsWith('http')) {
                const rootDir = path.resolve(__dirname, '..', '..');
                const oldLogoPath = path.join(rootDir, template.logo);
                
                if (fs.existsSync(oldLogoPath)) {
                    fs.unlinkSync(oldLogoPath);
                    console.log(`✅ Deleted old logo: ${oldLogoPath}`);
                }
            }
            // Set new logo path from file upload
            logoPath = `uploads/papers/logo/${req.file.filename}`;
        } else if (logo_url !== undefined) {
            // If logo_url is provided (even if empty string), use it
            if (logo_url && logo_url.trim() !== '') {
                logoPath = logo_url.trim();
            } else {
                logoPath = "/uploads/1739360660741.JPG"; // Default if empty
            }
        }

        // Calculate total marks if any marks are provided
        let totalMarks = template.total_marks || 0;
        if (marks_mcq !== undefined || marks_short !== undefined || marks_long !== undefined || 
            marks_blank !== undefined || marks_onetwo !== undefined || marks_truefalse !== undefined) {
            const marksMcq = marks_mcq !== undefined ? (parseInt(marks_mcq) || 0) : (template.marks_mcq || 0);
            const marksShort = marks_short !== undefined ? (parseInt(marks_short) || 0) : (template.marks_short || 0);
            const marksLong = marks_long !== undefined ? (parseInt(marks_long) || 0) : (template.marks_long || 0);
            const marksBlank = marks_blank !== undefined ? (parseInt(marks_blank) || 0) : (template.marks_blank || 0);
            const marksOnetwo = marks_onetwo !== undefined ? (parseInt(marks_onetwo) || 0) : (template.marks_onetwo || 0);
            const marksTruefalse = marks_truefalse !== undefined ? (parseInt(marks_truefalse) || 0) : (template.marks_truefalse || 0);
            totalMarks = marksMcq + marksShort + marksLong + marksBlank + marksOnetwo + marksTruefalse;
        }

        // Prepare update data (only include fields that are provided)
        const updateData = {};
        if (user_id !== undefined) updateData.user_id = user_id;
        if (type !== undefined) updateData.type = type;
        if (school_name !== undefined) updateData.school_name = school_name;
        if (standard !== undefined) updateData.standard = standard;
        if (timing !== undefined) updateData.timing = timing;
        if (date !== undefined) updateData.date = date;
        if (division !== undefined) updateData.division = division;
        if (address !== undefined) updateData.address = address;
        if (subject !== undefined) updateData.subject = subject;
        if (subject_title_id !== undefined) updateData.subject_title_id = subject_title_id ? parseInt(subject_title_id) : null;
        if (board !== undefined) updateData.board = board;
        if (paper_title !== undefined) updateData.paper_title = paper_title;
        if (body !== undefined) updateData.body = body;
        if (logo_url !== undefined) updateData.logo_url = logo_url && logo_url.trim() !== '' ? logo_url.trim() : null;
        if (marks_mcq !== undefined) updateData.marks_mcq = parseInt(marks_mcq) || 0;
        if (marks_short !== undefined) updateData.marks_short = parseInt(marks_short) || 0;
        if (marks_long !== undefined) updateData.marks_long = parseInt(marks_long) || 0;
        if (marks_blank !== undefined) updateData.marks_blank = parseInt(marks_blank) || 0;
        if (marks_onetwo !== undefined) updateData.marks_onetwo = parseInt(marks_onetwo) || 0;
        if (marks_truefalse !== undefined) updateData.marks_truefalse = parseInt(marks_truefalse) || 0;
        if (marks_mcq !== undefined || marks_short !== undefined || marks_long !== undefined || 
            marks_blank !== undefined || marks_onetwo !== undefined || marks_truefalse !== undefined) {
            updateData.total_marks = totalMarks;
        }
        if (req.file || logo_url !== undefined) updateData.logo = logoPath;
        if (metadata !== null) updateData.template_metadata = JSON.stringify(metadata);

        // Update the template
        await template.update(updateData);

        // Generate base URL for logo
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const updatedTemplate = {
            ...template.toJSON(),
            logo: template.logo && !template.logo.startsWith('http') ? `${baseUrl}/${template.logo}` : template.logo
        };

        // Parse template_metadata if it exists
        if (updatedTemplate.template_metadata) {
            try {
                updatedTemplate.template_metadata = typeof updatedTemplate.template_metadata === 'string' 
                    ? JSON.parse(updatedTemplate.template_metadata) 
                    : updatedTemplate.template_metadata;
            } catch (error) {
                console.error('Error parsing template_metadata:', error);
            }
        }

        return res.status(200).json({ 
            success: true, 
            message: "Template updated successfully", 
            data: updatedTemplate 
        });
    } catch (error) {
        console.error('Error updating template:', error);
        return res.status(500).json({ success: false, message: "Error updating template", error: error.message });
    }
};

// Clone Template
exports.cloneTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({ success: false, message: "user_id is required" });
        }

        // Fetch template
        const template = await Paper.findByPk(id);
        if (!template) {
            return res.status(404).json({ success: false, message: "Template not found" });
        }

        if (!template.is_template) {
            return res.status(400).json({ success: false, message: "Paper is not a template" });
        }

        // Parse template_metadata
        let metadata;
        try {
            metadata = template.template_metadata 
                ? (typeof template.template_metadata === 'string' ? JSON.parse(template.template_metadata) : template.template_metadata)
                : null;
        } catch (error) {
            return res.status(400).json({ success: false, message: "Invalid template_metadata format" });
        }

        if (!metadata || !metadata.header_id) {
            return res.status(400).json({ success: false, message: "Template metadata or header_id is missing" });
        }

        // Fetch header from headers table (if exists)
        const header = await Header.findByPk(metadata.header_id);

        // Create new paper with template data and header data
        const newPaper = await Paper.create({
            user_id: parseInt(user_id),
            type: template.type,
            school_name: header?.school_name || template.school_name,
            standard: template.standard,
            timing: template.timing,
            date: template.date,
            division: template.division,
            address: template.address,
            subject: template.subject,
            subject_title_id: header?.subject_title_id || template.subject_title_id,
            logo: header?.logo_url || template.logo,
            logo_url: header?.logo_url || template.logo_url,
            board: template.board,
            paper_title: template.paper_title, // Include paper_title when cloning
            body: template.body,
            marks_mcq: template.marks_mcq,
            marks_short: template.marks_short,
            marks_long: template.marks_long,
            marks_blank: template.marks_blank,
            marks_onetwo: template.marks_onetwo,
            marks_truefalse: template.marks_truefalse,
            total_marks: template.total_marks,
            is_template: false,
            template_metadata: JSON.stringify({ question_types: metadata.question_types || {} })
        });

        // Generate base URL
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const paperData = newPaper.toJSON();

        const formattedPaper = {
            ...paperData,
            logo: paperData.logo && !paperData.logo.startsWith('http') ? `${baseUrl}/${paperData.logo}` : (paperData.logo || null)
        };

        return res.status(201).json({ success: true, message: "Template cloned successfully", data: formattedPaper });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error cloning template", error: error.message });
    }
};

