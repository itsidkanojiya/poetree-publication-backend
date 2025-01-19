const Question = require('../models/Question'); 


exports.addQuestion = async (req, res) => {
    try {
        const { subject_title, question, answer, solution, type, options } = req.body;
        const image_url = req.file ? `/uploads/${req.file.filename}` : null; // Save image URL

        const newQuestion = await Question.create({
            subject_title,
            question,
            answer,
            solution,
            type,
            options,
            image_url,
        });

        res.status(201).json({ message: 'Question added successfully', question: newQuestion });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.editQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { subject_title, question, answer, solution, type, options } = req.body;
        const image_url = req.file ? `/uploads/${req.file.filename}` : undefined; // Update image if provided

        const existingQuestion = await Question.findByPk(id);
        if (!existingQuestion) return res.status(404).json({ message: 'Question not found' });

        await existingQuestion.update({
            subject_title,
            question,
            answer,
            solution,
            type,
            options,
            image_url: image_url || existingQuestion.image_url, // Keep old image if new not provided
        });

        res.status(200).json({ message: 'Question updated successfully', question: existingQuestion });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params;

        const question = await Question.findByPk(id);
        if (!question) return res.status(404).json({ message: 'Question not found' });

        await question.destroy();
        res.status(200).json({ message: 'Question deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getAllQuestions = async (req, res) => {
    try {
        const questions = await Question.findAll();
        res.status(200).json(questions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
