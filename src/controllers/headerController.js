const Header = require('../models/Header');

exports.addHeader = async (req, res) => {
    try {
        console.log(req.body); // Log the request body

        const { exam_type, school_name, logo_url, subject_title_id, user_id } = req.body;

        const header = await Header.create({ exam_type, school_name, logo_url, subject_title_id, user_id });
        res.status(201).json({ message: 'Header added successfully', header });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
// Edit Header by header_id
exports.editHeader = async (req, res) => {
    try {
        const { id } = req.params;
        const { exam_type, school_name, logo_url, subject_title_id } = req.body;

        const header = await Header.findByPk(id);
        if (!header) return res.status(404).json({ message: 'Header not found for the specified ID' });

        await header.update({ exam_type, school_name, logo_url, subject_title_id });
        res.status(200).json({ message: 'Header updated successfully', header });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Delete Header by header_id
exports.deleteHeader = async (req, res) => {
    try {
        const { id } = req.params;

        const header = await Header.findByPk(id);
        if (!header) return res.status(404).json({ message: 'Header not found for the specified ID' });

        await header.destroy();
        res.status(200).json({ message: 'Header deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get Headers by user_id
exports.getHeadersByUserId = async (req, res) => {
    try {
        const { user_id } = req.params;

        const headers = await Header.findAll({ where: { user_id } });
        if (!headers.length) {
            return res.status(404).json({ message: 'No headers found for the specified user ID' });
        }

        res.status(200).json({ headers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
