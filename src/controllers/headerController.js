  
const Header = require('../models/Header');

// Add Header
exports.addHeader = async (req, res) => {
    try {
        const { exam_type, school_name, logo_url, subject_id } = req.body;
        const header = await Header.create({ exam_type, school_name, logo_url, subject_id });
        res.status(201).json({ message: 'Header added successfully', header });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Edit Header
exports.editHeader = async (req, res) => {
    try {
        const { id } = req.params;
        const { exam_type, school_name, logo_url, subject_id } = req.body;
        const header = await Header.findByPk(id);
        if (!header) return res.status(404).json({ message: 'Header not found' });
        await header.update({ exam_type, school_name, logo_url, subject_id });
        res.status(200).json({ message: 'Header updated successfully', header });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get All Headers
exports.getHeaders = async (req, res) => {
    try {
        const headers = await Header.findAll();
        res.status(200).json(headers);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Delete Header
exports.deleteHeader = async (req, res) => {
    try {
        const { id } = req.params;
        const header = await Header.findByPk(id);
        if (!header) return res.status(404).json({ message: 'Header not found' });
        await header.destroy();
        res.status(200).json({ message: 'Header deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
