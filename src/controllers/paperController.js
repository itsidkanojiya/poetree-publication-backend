const Paper = require('../models/Paper'); // Adjust path if needed
const { SubjectTitle } = require('../models/Subjects');
const Question = require('../models/Question');
const UserSubject = require('../models/UserSubject');
const UserSubjectTitle = require('../models/UserSubjectTitle');
const { Op } = require('sequelize');
const path = require("path");
const fs = require("fs");

// Define association
Paper.belongsTo(SubjectTitle, { 
    foreignKey: 'subject_title_id', 
    as: 'subjectTitle'
});

const allowedTypes = ["custom", "default"];

exports.addPaper = async (req, res) => {
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
            body,
            student_name,
            roll_number,
            logo_url,
            marks_mcq,
            marks_short,
            marks_long,
            marks_blank,
            marks_onetwo,
            marks_truefalse
        } = req.body;

        // Validate required fields
        if (!user_id || !type || !school_name || !standard || !date || !subject || !board || !body) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // Validate type
        if (!allowedTypes.includes(type.toLowerCase())) {
            return res.status(400).json({ success: false, message: "Invalid paper type. Allowed values: 'custom', 'default'." });
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

        // Determine if this is a template
        const isTemplate = type.toLowerCase() === 'default';

        // Create paper entry
        const paper = await Paper.create({
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
            body,
            marks_mcq: marksMcq,
            marks_short: marksShort,
            marks_long: marksLong,
            marks_blank: marksBlank,
            marks_onetwo: marksOnetwo,
            marks_truefalse: marksTruefalse,
            total_marks: totalMarks,
            is_template: isTemplate,
            template_paper_id: null // Templates don't have a parent template
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

        const papers = await Paper.findAll();

        // Format the response to include full image URLs
        const formattedPapers = papers.map(paper => ({
            ...paper.toJSON(),
            logo: paper.logo && !paper.logo.startsWith('http') ? `${baseUrl}/${paper.logo}` : (paper.logo || null) // Convert relative path to full URL, keep URLs as-is
        }));

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

        let whereClause = { user_id };

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
            include: [{
                model: SubjectTitle,
                as: 'subjectTitle',
                attributes: ['subject_title_id', 'title_name'],
                required: false // LEFT JOIN - include papers even if subject_title_id is null
            }]
        });

        if (papers.length === 0) {
            return res.status(404).json({ success: false, message: "No papers found for this user with the specified type" });
        }

        // Generate base URL
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        // Format response to include full image URL and subject title name
        const formattedPapers = papers.map(paper => {
            const paperData = paper.toJSON();
            const { subjectTitle, ...rest } = paperData; // Extract subjectTitle to get the name, then remove it
            return {
                ...rest,
                logo: paperData.logo && !paperData.logo.startsWith('http') ? `${baseUrl}/${paperData.logo}` : (paperData.logo || null), // Convert relative path to full URL, keep URLs as-is
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
            school_name, 
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

        // Handle logo update - prioritize file upload, then URL, then keep existing
        let logoPath = paper.logo; // Keep existing logo by default
        
        if (req.file) {
            // Delete old logo if it exists and is not default
            if (paper.logo && paper.logo !== "/uploads/1739360660741.JPG" && !paper.logo.startsWith('http')) {
                const rootDir = path.resolve(__dirname, '..', '..');
                const oldLogoPath = path.join(rootDir, paper.logo);
                
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
        const paper = await Paper.findByPk(id);
        
        if (!paper) {
            return res.status(404).json({ success: false, message: 'Paper not found' });
        }

        // Generate base URL
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const formattedPaper = {
            ...paper.toJSON(),
            logo: paper.logo && !paper.logo.startsWith('http') ? `${baseUrl}/${paper.logo}` : (paper.logo || null) // Convert relative path to full URL, keep URLs as-is
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

// ==================== TEMPLATE/Default Paper APIs ====================

// Admin: Get all templates
exports.getTemplates = async (req, res) => {
    try {
        const { subject, standard, board } = req.query;
        
        const whereClause = { is_template: true };
        
        if (subject) whereClause.subject = subject;
        if (standard) whereClause.standard = parseInt(standard);
        if (board) whereClause.board = board;

        const templates = await Paper.findAll({
            where: whereClause,
            include: [{
                model: SubjectTitle,
                as: 'subjectTitle',
                attributes: ['subject_title_id', 'title_name'],
                required: false
            }],
            order: [['id', 'DESC']]
        });

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        
        const formattedTemplates = templates.map(template => {
            const templateData = template.toJSON();
            const { subjectTitle, ...rest } = templateData;
            
            // Parse body to get question count
            let questionCount = 0;
            try {
                const bodyArray = JSON.parse(templateData.body || '[]');
                questionCount = Array.isArray(bodyArray) ? bodyArray.length : 0;
            } catch (e) {
                questionCount = 0;
            }

            return {
                ...rest,
                logo: templateData.logo && !templateData.logo.startsWith('http') 
                    ? `${baseUrl}/${templateData.logo}` 
                    : (templateData.logo || null),
                subject_title_name: subjectTitle ? subjectTitle.title_name : null,
                question_count: questionCount
            };
        });

        return res.status(200).json({ 
            success: true, 
            templates: formattedTemplates 
        });
    } catch (error) {
        console.error('Error fetching templates:', error);
        return res.status(500).json({ 
            success: false, 
            message: "Error fetching templates", 
            error: error.message 
        });
    }
};

// Admin: Get single template with questions
exports.getTemplateById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const template = await Paper.findOne({
            where: { id, is_template: true },
            include: [{
                model: SubjectTitle,
                as: 'subjectTitle',
                attributes: ['subject_title_id', 'title_name'],
                required: false
            }]
        });

        if (!template) {
            return res.status(404).json({ 
                success: false, 
                message: 'Template not found' 
            });
        }

        // Parse body to get question IDs
        let questionIds = [];
        try {
            questionIds = JSON.parse(template.body || '[]');
        } catch (e) {
            questionIds = [];
        }

        // Fetch all questions
        const questions = await Question.findAll({
            where: { question_id: { [Op.in]: questionIds } }
        });
        
        // Sort questions by their position in questionIds array
        const questionMap = new Map(questions.map(q => [q.question_id, q]));
        const sortedQuestions = questionIds.map(id => questionMap.get(id)).filter(q => q !== undefined);

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const templateData = template.toJSON();
        const { subjectTitle, ...rest } = templateData;

        return res.status(200).json({
            success: true,
            template: {
                ...rest,
                logo: templateData.logo && !templateData.logo.startsWith('http') 
                    ? `${baseUrl}/${templateData.logo}` 
                    : (templateData.logo || null),
                subject_title_name: subjectTitle ? subjectTitle.title_name : null,
                questions: sortedQuestions.map(q => {
                    const qData = q.toJSON();
                    // Parse options if exists
                    let parsedOptions = null;
                    if (qData.options) {
                        try {
                            parsedOptions = typeof qData.options === 'string' 
                                ? JSON.parse(qData.options) 
                                : qData.options;
                        } catch (e) {
                            parsedOptions = qData.options;
                        }
                    }
                    return {
                        ...qData,
                        options: parsedOptions,
                        image_url: qData.image_url ? `${baseUrl}/${qData.image_url}` : null
                    };
                })
            }
        });
    } catch (error) {
        console.error('Error fetching template:', error);
        return res.status(500).json({ 
            success: false, 
            message: "Error fetching template", 
            error: error.message 
        });
    }
};

// User: Get available templates (filtered by user's approved subjects/standards)
exports.getAvailableTemplates = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.user_id;
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: "User authentication required" 
            });
        }

        const { subject_id, standard, board_id } = req.query;

        // Get user's approved subjects and subject titles
        const [approvedSubjects, approvedSubjectTitles] = await Promise.all([
            UserSubject.findAll({
                where: { user_id: userId, status: 'approved' },
                attributes: ['subject_id']
            }),
            UserSubjectTitle.findAll({
                where: { user_id: userId, status: 'approved' },
                attributes: ['subject_id', 'subject_title_id']
            })
        ]);

        const userSubjectIds = approvedSubjects.map(s => s.subject_id);
        const userSubjectTitleIds = approvedSubjectTitles.map(st => st.subject_title_id);

        // Build where clause for templates
        const whereClause = { is_template: true };
        
        if (subject_id) {
            whereClause.subject_id = subject_id;
        }
        if (standard) {
            whereClause.standard = parseInt(standard);
        }
        if (board_id) {
            whereClause.board_id = parseInt(board_id);
        }

        // Get templates
        const templates = await Paper.findAll({
            where: whereClause,
            include: [{
                model: SubjectTitle,
                as: 'subjectTitle',
                attributes: ['subject_title_id', 'title_name'],
                required: false
            }],
            order: [['id', 'DESC']]
        });

        // Filter templates based on user's approved subjects (if not already filtered)
        const filteredTemplates = templates.filter(template => {
            // If subject_id filter is provided, it's already filtered
            if (subject_id) return true;
            
            // Otherwise, check if template's subject matches user's approved subjects
            // This is a simplified check - you may need to match by subject name or ID
            return true; // For now, return all templates. Adjust based on your subject matching logic
        });

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        
        const formattedTemplates = filteredTemplates.map(template => {
            const templateData = template.toJSON();
            const { subjectTitle, ...rest } = templateData;
            
            // Parse body to get question count
            let questionCount = 0;
            try {
                const bodyArray = JSON.parse(templateData.body || '[]');
                questionCount = Array.isArray(bodyArray) ? bodyArray.length : 0;
            } catch (e) {
                questionCount = 0;
            }

            return {
                ...rest,
                logo: templateData.logo && !templateData.logo.startsWith('http') 
                    ? `${baseUrl}/${templateData.logo}` 
                    : (templateData.logo || null),
                subject_title_name: subjectTitle ? subjectTitle.title_name : null,
                question_count: questionCount,
                marks_breakdown: {
                    mcq: templateData.marks_mcq || 0,
                    short: templateData.marks_short || 0,
                    long: templateData.marks_long || 0,
                    blank: templateData.marks_blank || 0,
                    onetwo: templateData.marks_onetwo || 0,
                    truefalse: templateData.marks_truefalse || 0
                }
            };
        });

        return res.status(200).json({ 
            success: true, 
            templates: formattedTemplates 
        });
    } catch (error) {
        console.error('Error fetching available templates:', error);
        return res.status(500).json({ 
            success: false, 
            message: "Error fetching available templates", 
            error: error.message 
        });
    }
};

// User: View template details (read-only)
exports.viewTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id || req.user?.user_id;
        
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: "User authentication required" 
            });
        }

        const template = await Paper.findOne({
            where: { id, is_template: true },
            include: [{
                model: SubjectTitle,
                as: 'subjectTitle',
                attributes: ['subject_title_id', 'title_name'],
                required: false
            }]
        });

        if (!template) {
            return res.status(404).json({ 
                success: false, 
                message: 'Template not found' 
            });
        }

        // Parse body to get question IDs
        let questionIds = [];
        try {
            questionIds = JSON.parse(template.body || '[]');
        } catch (e) {
            questionIds = [];
        }

        // Fetch all questions with position
        const questions = await Question.findAll({
            where: { question_id: { [Op.in]: questionIds } }
        });

        // Sort questions by their position in the body array
        const sortedQuestions = questionIds.map((qId, index) => {
            const question = questions.find(q => q.question_id === qId);
            if (question) {
                const qData = question.toJSON();
                let parsedOptions = null;
                if (qData.options) {
                    try {
                        parsedOptions = typeof qData.options === 'string' 
                            ? JSON.parse(qData.options) 
                            : qData.options;
                    } catch (e) {
                        parsedOptions = qData.options;
                    }
                }
                return {
                    ...qData,
                    position: index + 1,
                    options: parsedOptions
                };
            }
            return null;
        }).filter(q => q !== null);

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const templateData = template.toJSON();
        const { subjectTitle, ...rest } = templateData;

        return res.status(200).json({
            success: true,
            template: {
                ...rest,
                logo: templateData.logo && !templateData.logo.startsWith('http') 
                    ? `${baseUrl}/${templateData.logo}` 
                    : (templateData.logo || null),
                subject_title_name: subjectTitle ? subjectTitle.title_name : null,
                questions: sortedQuestions.map(q => ({
                    ...q,
                    image_url: q.image_url ? `${baseUrl}/${q.image_url}` : null
                })),
                is_template: true,
                can_customize: true
            }
        });
    } catch (error) {
        console.error('Error viewing template:', error);
        return res.status(500).json({ 
            success: false, 
            message: "Error viewing template", 
            error: error.message 
        });
    }
};

// User: Customize template (create copy with question replacements)
exports.customizeTemplate = async (req, res) => {
    try {
        const { id } = req.params; // Template ID
        const { replacements } = req.body; // Array of {position, question_id}
        const userId = req.user?.id || req.user?.user_id;

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: "User authentication required" 
            });
        }

        // Get template
        const template = await Paper.findByPk(id);
        if (!template || !template.is_template) {
            return res.status(404).json({ 
                success: false, 
                message: 'Template not found' 
            });
        }

        // Parse template body
        let bodyArray = [];
        try {
            bodyArray = JSON.parse(template.body || '[]');
        } catch (e) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid template body format' 
            });
        }

        // Validate and apply replacements
        if (replacements && Array.isArray(replacements)) {
            for (const replacement of replacements) {
                const { position, question_id } = replacement;
                
                if (!position || !question_id) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Each replacement must have position and question_id' 
                    });
                }

                const index = position - 1; // Convert to 0-based index
                if (index < 0 || index >= bodyArray.length) {
                    return res.status(400).json({ 
                        success: false, 
                        message: `Invalid position: ${position}. Valid range: 1-${bodyArray.length}` 
                    });
                }

                // Verify question exists
                const question = await Question.findByPk(question_id);
                if (!question) {
                    return res.status(404).json({ 
                        success: false, 
                        message: `Question with ID ${question_id} not found` 
                    });
                }

                // Replace question
                bodyArray[index] = question_id;
            }
        }

        // Recalculate marks based on new questions
        const questions = await Question.findAll({
            where: { question_id: { [Op.in]: bodyArray } }
        });

        let marksMcq = 0, marksShort = 0, marksLong = 0, marksBlank = 0, marksOnetwo = 0, marksTruefalse = 0;

        questions.forEach(q => {
            const marks = q.marks || 0;
            switch (q.type) {
                case 'mcq':
                    marksMcq += marks;
                    break;
                case 'short':
                    marksShort += marks;
                    break;
                case 'long':
                    marksLong += marks;
                    break;
                case 'blank':
                    marksBlank += marks;
                    break;
                case 'onetwo':
                    marksOnetwo += marks;
                    break;
                case 'truefalse':
                    marksTruefalse += marks;
                    break;
            }
        });

        const totalMarks = marksMcq + marksShort + marksLong + marksBlank + marksOnetwo + marksTruefalse;

        // Create new custom paper
        const customPaper = await Paper.create({
            user_id: userId,
            type: 'custom',
            school_name: template.school_name,
            standard: template.standard,
            timing: template.timing,
            date: template.date,
            division: template.division,
            address: template.address,
            subject: template.subject,
            subject_title_id: template.subject_title_id,
            logo: template.logo,
            logo_url: template.logo_url,
            board: template.board,
            body: JSON.stringify(bodyArray),
            marks_mcq: marksMcq,
            marks_short: marksShort,
            marks_long: marksLong,
            marks_blank: marksBlank,
            marks_onetwo: marksOnetwo,
            marks_truefalse: marksTruefalse,
            total_marks: totalMarks,
            is_template: false,
            template_paper_id: id
        });

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const paperData = customPaper.toJSON();

        return res.status(201).json({
            success: true,
            message: "Paper customized successfully",
            paper: {
                ...paperData,
                logo: paperData.logo && !paperData.logo.startsWith('http') 
                    ? `${baseUrl}/${paperData.logo}` 
                    : (paperData.logo || null)
            }
        });
    } catch (error) {
        console.error('Error customizing template:', error);
        return res.status(500).json({ 
            success: false, 
            message: "Error customizing template", 
            error: error.message 
        });
    }
};

// User: Replace single question in customized paper
exports.replaceQuestion = async (req, res) => {
    try {
        const { id } = req.params; // Paper ID
        const { position, question_id } = req.body;
        const userId = req.user?.id || req.user?.user_id;

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: "User authentication required" 
            });
        }

        if (!position || !question_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'position and question_id are required' 
            });
        }

        // Get paper
        const paper = await Paper.findByPk(id);
        if (!paper) {
            return res.status(404).json({ 
                success: false, 
                message: 'Paper not found' 
            });
        }

        // Verify paper belongs to user
        if (paper.user_id !== userId) {
            return res.status(403).json({ 
                success: false, 
                message: 'You can only modify your own papers' 
            });
        }

        // Verify paper is customized (has template_paper_id)
        if (!paper.template_paper_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'This paper is not a customized template. Only customized papers can have questions replaced.' 
            });
        }

        // Parse body
        let bodyArray = [];
        try {
            bodyArray = JSON.parse(paper.body || '[]');
        } catch (e) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid paper body format' 
            });
        }

        // Validate position
        const index = position - 1;
        if (index < 0 || index >= bodyArray.length) {
            return res.status(400).json({ 
                success: false, 
                message: `Invalid position: ${position}. Valid range: 1-${bodyArray.length}` 
            });
        }

        // Verify question exists
        const question = await Question.findByPk(question_id);
        if (!question) {
            return res.status(404).json({ 
                success: false, 
                message: `Question with ID ${question_id} not found` 
            });
        }

        // Get old question for marks recalculation
        const oldQuestionId = bodyArray[index];
        const oldQuestion = await Question.findByPk(oldQuestionId);

        // Replace question
        bodyArray[index] = question_id;

        // Recalculate marks
        const questions = await Question.findAll({
            where: { question_id: { [Op.in]: bodyArray } }
        });

        let marksMcq = 0, marksShort = 0, marksLong = 0, marksBlank = 0, marksOnetwo = 0, marksTruefalse = 0;

        questions.forEach(q => {
            const marks = q.marks || 0;
            switch (q.type) {
                case 'mcq':
                    marksMcq += marks;
                    break;
                case 'short':
                    marksShort += marks;
                    break;
                case 'long':
                    marksLong += marks;
                    break;
                case 'blank':
                    marksBlank += marks;
                    break;
                case 'onetwo':
                    marksOnetwo += marks;
                    break;
                case 'truefalse':
                    marksTruefalse += marks;
                    break;
            }
        });

        const totalMarks = marksMcq + marksShort + marksLong + marksBlank + marksOnetwo + marksTruefalse;

        // Update paper
        await paper.update({
            body: JSON.stringify(bodyArray),
            marks_mcq: marksMcq,
            marks_short: marksShort,
            marks_long: marksLong,
            marks_blank: marksBlank,
            marks_onetwo: marksOnetwo,
            marks_truefalse: marksTruefalse,
            total_marks: totalMarks
        });

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const paperData = paper.toJSON();

        return res.status(200).json({
            success: true,
            message: "Question replaced successfully",
            paper: {
                ...paperData,
                logo: paperData.logo && !paperData.logo.startsWith('http') 
                    ? `${baseUrl}/${paperData.logo}` 
                    : (paperData.logo || null)
            }
        });
    } catch (error) {
        console.error('Error replacing question:', error);
        return res.status(500).json({ 
            success: false, 
            message: "Error replacing question", 
            error: error.message 
        });
    }
};

// User: Get my customized papers
exports.getMyCustomizedPapers = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.user_id;
        const { template_id } = req.query;

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: "User authentication required" 
            });
        }

        const whereClause = { 
            user_id: userId,
            template_paper_id: { [Op.ne]: null } // Only customized papers
        };

        if (template_id) {
            whereClause.template_paper_id = parseInt(template_id);
        }

        const papers = await Paper.findAll({
            where: whereClause,
            include: [{
                model: SubjectTitle,
                as: 'subjectTitle',
                attributes: ['subject_title_id', 'title_name'],
                required: false
            }],
            order: [['id', 'DESC']]
        });

        // Get template information for each paper
        const papersWithTemplateInfo = await Promise.all(
            papers.map(async (paper) => {
                const paperData = paper.toJSON();
                const { subjectTitle, ...rest } = paperData;

                // Get template info
                let templateInfo = null;
                if (paper.template_paper_id) {
                    const template = await Paper.findByPk(paper.template_paper_id, {
                        attributes: ['id', 'subject', 'standard', 'board']
                    });
                    if (template) {
                        templateInfo = {
                            id: template.id,
                            name: `${template.subject} Standard ${template.standard}`,
                            subject: template.subject,
                            standard: template.standard,
                            board: template.board
                        };
                    }
                }

                // Count customizations (compare body with template body)
                let customizationsCount = 0;
                if (paper.template_paper_id) {
                    const template = await Paper.findByPk(paper.template_paper_id);
                    if (template) {
                        try {
                            const templateBody = JSON.parse(template.body || '[]');
                            const paperBody = JSON.parse(paper.body || '[]');
                            customizationsCount = templateBody.filter((qId, index) => 
                                paperBody[index] !== qId
                            ).length;
                        } catch (e) {
                            customizationsCount = 0;
                        }
                    }
                }

                return {
                    ...rest,
                    subject_title_name: subjectTitle ? subjectTitle.title_name : null,
                    template_info: templateInfo,
                    customizations_count: customizationsCount
                };
            })
        );

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const formattedPapers = papersWithTemplateInfo.map(paper => ({
            ...paper,
            logo: paper.logo && !paper.logo.startsWith('http') 
                ? `${baseUrl}/${paper.logo}` 
                : (paper.logo || null)
        }));

        return res.status(200).json({
            success: true,
            papers: formattedPapers
        });
    } catch (error) {
        console.error('Error fetching customized papers:', error);
        return res.status(500).json({ 
            success: false, 
            message: "Error fetching customized papers", 
            error: error.message 
        });
    }
};
