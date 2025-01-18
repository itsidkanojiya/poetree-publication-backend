 
const Worksheet = require('../models/Worksheet');

// Add Worksheet
exports.addWorksheet = async (req, res) => {
    try {
        const { subject_id, worksheet_url, worksheet_logo } = req.body;
        const worksheet = await Worksheet.create({ subject_id, worksheet_url, worksheet_logo });
        res.status(201).json({ message: 'Worksheet added successfully', worksheet });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Get All Worksheets
exports.getWorksheets = async (req, res) => {
    try {
        const worksheets = await Worksheet.findAll();
        res.status(200).json(worksheets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Delete Worksheet
exports.deleteWorksheet = async (req, res) => {
    try {
        const { id } = req.params;
        const worksheet = await Worksheet.findByPk(id);
        if (!worksheet) {
            return res.status(404).json({ message: 'Worksheet not found' });
        }
        await worksheet.destroy();
        res.status(200).json({ message: 'Worksheet deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
