const Paper = require('../models/Paper'); // Adjust path if needed

// Allowed paper types
const allowedTypes = ["custom", "default"];

// Add a new paper with validation
exports.addPaper = async (req, res) => {
    try {
        const { type } = req.body;

        // Check if type is valid
        if (!allowedTypes.includes(type.toLowerCase())) {
            return res.status(400).json({ success: false, message: "Invalid paper type. Allowed values: 'custom', 'default'." });
        }

        const paper = await Paper.create(req.body);
        return res.status(201).json({ success: true, message: "Paper added successfully", data: paper });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error adding paper", error: error.message });
    }
};

// Get all papers
exports.getAllPapers = async (req, res) => {
    try {
        const papers = await Paper.findAll();
        return res.status(200).json({ success: true, data: papers });
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

        const papers = await Paper.findAll({ where: whereClause });

        if (papers.length === 0) {
            return res.status(404).json({ success: false, message: "No papers found for this user with the specified type" });
        }
        return res.status(200).json({ success: true, papers: papers });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error fetching papers", error: error.message });
    }
};

// Get papers by type (custom or default)
exports.getPapersByType = async (req, res) => {
    try {
        const { type } = req.params;

        // Check if type is valid
        if (!allowedTypes.includes(type.toLowerCase())) {
            return res.status(400).json({ success: false, message: "Invalid paper type. Allowed values: 'custom', 'default'." });
        }

        const papers = await Paper.findAll({ where: { type } });

        if (papers.length === 0) {
            return res.status(404).json({ success: false, message: "No papers found for this type" });
        }

        return res.status(200).json({ success: true, papers: papers });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error fetching papers", error: error.message });
    }
};
