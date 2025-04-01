const Paper = require('../models/Paper'); // Adjust path if needed


const allowedTypes = ["custom", "default"];

exports.addPaper = async (req, res) => {
    try {
        const { user_id, type, school_name, standard, timing, date, division, address, subject, board, body } = req.body;

        // Validate required fields
        if (!user_id || !type || !school_name || !standard || !timing || !date || !address || !subject || !board || !body) {
            
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // Validate type
        if (!allowedTypes.includes(type.toLowerCase())) {
            return res.status(400).json({ success: false, message: "Invalid paper type. Allowed values: 'custom', 'default'." });
        }

        // Get the uploaded image path for `logo`
        const logo = req.file ? `uploads/papers/logo/${req.file.filename}` : "/uploads/1739360660741.JPG";

        // Create paper entry
        const paper = await Paper.create({
            user_id,
            type,
            school_name,
            standard,
            timing,
            date,
            division,
            address,
            subject,
            logo, // Save image path
            board,
            body
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
            logo: paper.logo ? `${baseUrl}/${paper.logo}` : null // Convert relative path to full URL
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

        const papers = await Paper.findAll({ where: whereClause });

        if (papers.length === 0) {
            return res.status(404).json({ success: false, message: "No papers found for this user with the specified type" });
        }

        // Generate base URL
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        // Format response to include full image URL
        const formattedPapers = papers.map(paper => ({
            ...paper.toJSON(),
            logo: paper.logo ? `${baseUrl}/${paper.logo}` : null // Convert relative path to full URL
        }));

        return res.status(200).json({ success: true, papers: formattedPapers });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error fetching papers", error: error.message });
    }
};


exports.deletePaper = async (req, res) => {
    try {
        const { id } = req.params;

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
