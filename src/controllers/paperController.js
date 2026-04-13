const Paper = require('../models/Paper'); // Adjust path if needed
const User = require('../models/User');
const Chapter = require('../models/Chapter');
const Question = require('../models/Question');
const { SubjectTitle } = require('../models/Subjects');
const {
  buildProposal,
  buildTotals,
  buildSuggestions,
  normalizeDifficulty,
  validateSectionWeights,
  SECTION_WEIGHT_KEYS,
  canonicalToDbType,
} = require('../services/smartPaperPropose');
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

const allowedTypes = ["custom", "default", "quiz"];

/**
 * Normalize chapter input: accept chapter_id (single number) or chapter_ids (array of numbers).
 * Validates each ID exists and belongs to subject_title_id. Returns { chapterId, chapterIdsJson }.
 * chapterId = first element for backward compat; chapterIdsJson = JSON string for DB.
 */
async function normalizePaperChapters(chapter_id, chapter_ids, subject_title_id) {
    let ids = [];
    if (chapter_ids != null) {
        const arr = Array.isArray(chapter_ids) ? chapter_ids : (typeof chapter_ids === 'string' ? (() => { try { return JSON.parse(chapter_ids); } catch { return []; } })() : []);
        ids = arr.map((x) => parseInt(x, 10)).filter((x) => !isNaN(x));
    }
    if (ids.length === 0 && chapter_id != null && chapter_id !== '') {
        const cid = parseInt(chapter_id, 10);
        if (!isNaN(cid)) ids = [cid];
    }
    if (ids.length === 0) return { chapterId: null, chapterIdsJson: null };

    const stId = subject_title_id != null ? parseInt(subject_title_id, 10) : null;
    for (const cid of ids) {
        const chapter = await Chapter.findByPk(cid);
        if (!chapter) throw new Error('Chapter not found');
        if (stId != null && chapter.subject_title_id !== stId) throw new Error('Chapter does not belong to the selected subject title');
    }
    const unique = [...new Set(ids)];
    return {
        chapterId: unique[0] || null,
        chapterIdsJson: JSON.stringify(unique),
    };
}

function parseChapterIds(paper) {
    const raw = paper.chapter_ids;
    if (raw == null || raw === '') return [];
    try {
        const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Array.isArray(arr) ? arr.map((x) => parseInt(x, 10)).filter((x) => !isNaN(x)) : [];
    } catch {
        return [];
    }
}

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
            chapter_id,
            chapter_ids,
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
            return res.status(400).json({ success: false, message: "Invalid paper type. Allowed values: 'custom', 'default', 'quiz'." });
        }

        let chapterIdVal = null;
        let chapterIdsJsonVal = null;
        try {
            const normalized = await normalizePaperChapters(chapter_id, chapter_ids, subject_title_id);
            chapterIdVal = normalized.chapterId;
            chapterIdsJsonVal = normalized.chapterIdsJson;
        } catch (e) {
            if (e.message === 'Chapter not found') {
                return res.status(404).json({ success: false, message: "Chapter not found" });
            }
            if (e.message && e.message.includes('does not belong')) {
                return res.status(400).json({ success: false, message: "Chapter does not belong to the selected subject title" });
            }
            return res.status(400).json({ success: false, message: e.message || "Invalid chapter_id or chapter_ids" });
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
            chapter_id: chapterIdVal,
            chapter_ids: chapterIdsJsonVal,
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
            const chapterIdsArr = parseChapterIds(paper);
            return {
                ...rest,
                school_name,
                address,
                logo,
                chapter_ids: chapterIdsArr,
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
            const allowedTypesFilter = ["custom", "default", "quiz"];
            if (!allowedTypesFilter.includes(type.toLowerCase())) {
                return res.status(400).json({ success: false, message: "Invalid paper type. Allowed values: 'custom', 'default', 'quiz'." });
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
                subject_title_name: subjectTitle ? subjectTitle.title_name : null,
                chapter_ids: parseChapterIds(paper),
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
            chapter_id,
            chapter_ids,
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
            return res.status(400).json({ success: false, message: "Invalid paper type. Allowed values: 'custom', 'default', 'quiz'." });
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
        if (chapter_id !== undefined || chapter_ids !== undefined) {
            const stId = (subject_title_id != null ? parseInt(subject_title_id, 10) : null) ?? paper.subject_title_id;
            let existingIds = null;
            try {
                if (paper.chapter_ids) existingIds = JSON.parse(paper.chapter_ids);
            } catch { existingIds = paper.chapter_id != null ? [paper.chapter_id] : []; }
            try {
                const normalized = await normalizePaperChapters(
                    chapter_id !== undefined ? chapter_id : paper.chapter_id,
                    chapter_ids !== undefined ? chapter_ids : existingIds,
                    stId
                );
                updateData.chapter_id = normalized.chapterId;
                updateData.chapter_ids = normalized.chapterIdsJson;
            } catch (e) {
                if (e.message === 'Chapter not found') {
                    return res.status(404).json({ success: false, message: 'Chapter not found' });
                }
                if (e.message && e.message.includes('does not belong')) {
                    return res.status(400).json({ success: false, message: "Chapter does not belong to the paper's subject title" });
                }
                return res.status(400).json({ success: false, message: e.message || 'Invalid chapter_id or chapter_ids' });
            }
        }
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
            logo: paper.logo && !paper.logo.startsWith('http') ? `${baseUrl}/${paper.logo}` : paper.logo,
            chapter_ids: parseChapterIds(paper),
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
            subject_title_name: subjectTitle ? subjectTitle.title_name : null,
            template_metadata: parsedMetadata,
            chapter_ids: parseChapterIds(paper),
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
            chapter_id,
            chapter_ids,
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
            return res.status(400).json({ success: false, message: "Invalid paper type. Allowed values: 'custom', 'default', 'quiz'." });
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

        // Optional chapter_id / chapter_ids for template (null allowed)
        let templateChapterId = null;
        let templateChapterIdsJson = null;
        try {
            const normalized = await normalizePaperChapters(chapter_id, chapter_ids, subject_title_id);
            templateChapterId = normalized.chapterId;
            templateChapterIdsJson = normalized.chapterIdsJson;
        } catch {
            // ignore invalid chapter for template; leave null
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
            chapter_id: templateChapterId,
            chapter_ids: templateChapterIdsJson,
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
            return res.status(400).json({ success: false, message: "Invalid paper type. Allowed values: 'custom', 'default', 'quiz'." });
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

/**
 * POST /api/papers/smart-propose
 * Balances section (type), chapter, and difficulty by marks. Auth: Bearer token.
 * by_difficulty.actual_percent is share of total paper marks (marks-based).
 */
exports.smartPropose = async (req, res) => {
    try {
        const body = req.body || {};
        const subject_title_id = parseInt(body.subject_title_id, 10);
        const board_id = parseInt(body.board_id, 10);
        const standard = parseInt(body.standard, 10);
        const total_marks = parseInt(body.total_marks, 10);

        if (isNaN(subject_title_id) || isNaN(board_id) || isNaN(standard)) {
            return res.status(400).json({
                success: false,
                error: 'subject_title_id, board_id, and standard must be numbers',
            });
        }
        if (isNaN(total_marks) || total_marks < 1) {
            return res.status(400).json({
                success: false,
                error: 'total_marks must be a positive integer',
            });
        }

        const { chapter_weights, difficulty_weights, section_weights, section_question_counts, exclude_question_ids } = body;

        if (!chapter_weights || !Array.isArray(chapter_weights) || chapter_weights.length === 0) {
            return res.status(400).json({ success: false, error: 'chapter_weights must be a non-empty array' });
        }
        if (!difficulty_weights || typeof difficulty_weights !== 'object') {
            return res.status(400).json({ success: false, error: 'difficulty_weights is required' });
        }
        const hasSectionCounts =
            section_question_counts && typeof section_question_counts === 'object' && !Array.isArray(section_question_counts);
        const hasSectionWeights =
            section_weights && typeof section_weights === 'object' && !Array.isArray(section_weights);

        if (!hasSectionCounts && !hasSectionWeights) {
            return res.status(400).json({
                success: false,
                error: 'Either section_question_counts or section_weights is required',
            });
        }

        let sectionWeightsNorm = {};
        if (hasSectionCounts) {
            const countErrors = [];
            const extra = Object.keys(section_question_counts).filter((k) => !SECTION_WEIGHT_KEYS.includes(k));
            if (extra.length) {
                countErrors.push(`Unknown section_question_counts keys: ${extra.join(', ')}`);
            }

            let totalCount = 0;
            for (const k of SECTION_WEIGHT_KEYS) {
                if (section_question_counts[k] == null) {
                    countErrors.push(`Missing section_question_counts.${k}`);
                    continue;
                }
                const v = Number(section_question_counts[k]);
                if (!Number.isFinite(v) || !Number.isInteger(v) || v < 0) {
                    countErrors.push(`Invalid section_question_counts.${k}: must be an integer >= 0`);
                    continue;
                }
                totalCount += v;
            }

            if (totalCount < 1) {
                countErrors.push('section_question_counts must sum to at least 1');
            }

            if (countErrors.length) {
                return res.status(400).json({
                    success: false,
                    error: countErrors[0] || 'Invalid section_question_counts',
                    errors: countErrors,
                });
            }

            for (const k of SECTION_WEIGHT_KEYS) {
                sectionWeightsNorm[k] = (Number(section_question_counts[k]) / totalCount) * 100;
            }
        } else {
            const swValidation = validateSectionWeights(section_weights);
            if (!swValidation.ok) {
                return res.status(400).json({
                    success: false,
                    error: swValidation.errors[0] || 'Invalid section_weights',
                    errors: swValidation.errors,
                });
            }

            for (const k of SECTION_WEIGHT_KEYS) {
                sectionWeightsNorm[k] = Number(section_weights[k]) || 0;
            }
        }

        for (const k of ['easy', 'medium', 'hard']) {
            if (difficulty_weights[k] === undefined || difficulty_weights[k] === null) {
                return res.status(400).json({
                    success: false,
                    error: `difficulty_weights.${k} is required`,
                });
            }
        }
        const dwSum = ['easy', 'medium', 'hard'].reduce(
            (s, k) => s + (Number(difficulty_weights[k]) || 0),
            0
        );
        if (Math.abs(dwSum - 100) > 0.001) {
            return res.status(400).json({
                success: false,
                error: 'difficulty_weights must sum to 100',
                actual_sum: dwSum,
            });
        }

        const difficultyWeightsNorm = {
            easy: Number(difficulty_weights.easy) || 0,
            medium: Number(difficulty_weights.medium) || 0,
            hard: Number(difficulty_weights.hard) || 0,
        };

        let cw = chapter_weights.map((c) => ({
            chapter_id: parseInt(c.chapter_id, 10),
            percent: Number(c.percent),
        }));
        if (cw.some((c) => isNaN(c.chapter_id) || isNaN(c.percent))) {
            return res.status(400).json({
                success: false,
                error: 'Each chapter_weights item needs numeric chapter_id and percent',
            });
        }

        const warnings = [];
        const cwSum = cw.reduce((s, c) => s + c.percent, 0);
        if (Math.abs(cwSum - 100) > 0.001) {
            warnings.push(`chapter_weights sum was ${cwSum}; normalized to 100.`);
            cw = cw.map((c) => ({ ...c, percent: (c.percent / cwSum) * 100 }));
        }

        const chapterIds = [...new Set(cw.map((c) => c.chapter_id))];
        const chapters = await Chapter.findAll({
            where: {
                chapter_id: { [Op.in]: chapterIds },
                subject_title_id,
            },
        });
        if (chapters.length !== chapterIds.length) {
            return res.status(400).json({
                success: false,
                error: 'One or more chapter_id values are invalid for this subject_title_id',
            });
        }

        const exclude = new Set(
            Array.isArray(exclude_question_ids)
                ? exclude_question_ids.map((x) => parseInt(x, 10)).filter((x) => !isNaN(x))
                : []
        );

        const positiveCanonical = SECTION_WEIGHT_KEYS.filter((k) => (sectionWeightsNorm[k] || 0) > 0);
        const dbTypes = [...new Set(positiveCanonical.map((c) => canonicalToDbType(c)))];
        if (dbTypes.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one section weight must be greater than 0',
            });
        }

        const wherePool = {
            subject_title_id,
            board_id,
            standard,
            type: { [Op.in]: dbTypes },
        };
        if (exclude.size) {
            wherePool.question_id = { [Op.notIn]: [...exclude] };
        }

        const poolRows = await Question.findAll({
            where: wherePool,
            attributes: ['question_id', 'type', 'marks', 'chapter_id', 'difficulty'],
            raw: true,
        });

        if (poolRows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No questions in pool for the given filters',
            });
        }

        const pool = poolRows.map((q) => ({
            ...q,
            marks: parseInt(q.marks, 10) || 0,
        }));

        const chapterIdSet = new Set(cw.map((c) => c.chapter_id));
        const poolFiltered = pool.filter(
            (q) =>
                q.chapter_id != null &&
                chapterIdSet.has(Number(q.chapter_id)) &&
                q.marks > 0
        );

        if (poolFiltered.length === 0) {
            return res.status(404).json({
                success: false,
                error:
                    'No questions in pool for the given filters (check chapter_ids and that questions have positive marks)',
            });
        }

        const proposal = buildProposal({
            pool: poolFiltered,
            total_marks,
            section_weights: sectionWeightsNorm,
            chapter_weights: cw,
            difficulty_weights: difficultyWeightsNorm,
            warnings,
        });

        const selected = proposal.selected;
        const questions = selected.map((q, i) => ({
            question_id: q.question_id,
            type: q.type,
            marks: q.marks,
            chapter_id: q.chapter_id,
            difficulty: normalizeDifficulty(q.difficulty),
            order: i + 1,
        }));

        const totals = buildTotals({
            section_weights: sectionWeightsNorm,
            chapter_weights: cw,
            difficulty_weights: difficultyWeightsNorm,
            selected,
        });

        const suggestions = buildSuggestions(warnings, cw, poolFiltered);

        return res.status(200).json({
            success: selected.length > 0,
            questions,
            totals,
            warnings,
            suggestions,
            meta: {
                balancing:
                    'Marks are used for section, chapter, and difficulty targets (by_difficulty.actual_percent is % of total paper marks).',
                section_weights:
                    'All eight keys required: mcq, blank, true_false, onetwo, short, long, passage, match (sum 100). DB stores truefalse; totals use true_false.',
            },
        });
    } catch (error) {
        console.error('smartPropose:', error);
        return res.status(500).json({
            success: false,
            message: 'Error building smart proposal',
            error: error.message,
        });
    }
};

