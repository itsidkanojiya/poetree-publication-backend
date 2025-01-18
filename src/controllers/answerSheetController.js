  
const AnswerSheet = require('../models/AnswerSheet');

// Add Answer Sheet
exports.addAnswerSheet = async (req, res) => {
    try {
        const { subject_id, answer_sheet_url, answer_sheet_logo } = req.body;
        const answerSheet = await AnswerSheet.create({ subject_id, answer_sheet_url, answer_sheet_logo });
        res.status(201).json({ message: 'Answer sheet added successfully', answerSheet });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Get All Answer Sheets
exports.getAllAnswerSheets = async (req, res) => {
    try {
        const answerSheets = await AnswerSheet.findAll();
        res.status(200).json(answerSheets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Delete Answer Sheet
exports.deleteAnswerSheet = async (req, res) => {
    try {
        const { id } = req.params;
        const answerSheet = await AnswerSheet.findByPk(id);
        if (!answerSheet) return res.status(404).json({ message: 'Answer sheet not found' });
        await answerSheet.destroy();
        res.status(200).json({ message: 'Answer sheet deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
