const Paper = require('../models/Paper'); // Adjust path if needed
const { SubjectTitle } = require('../models/Subjects');
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
