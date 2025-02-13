const Question = require('../models/Question');

// Add a new question
exports.addQuestion = async (req, res) => {
    try {
        const { subject_title_id, subject_id, class: classLevel, board_id, question, answer, solution, type, options } = req.body;

        if (!subject_title_id || !subject_id || !classLevel || !board_id || !question || !answer || !type) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (!['mcq', 'short', 'long', 'blank', 'onetwo'].includes(type)) {
            return res.status(400).json({ error: "Invalid question type" });
        }

        // Handle optional image upload
        const image_url = req.file ? `/uploads/question/${type}/${req.file.filename}` : null;

        // Ensure `options` are correctly formatted
        const formattedOptions = options ? (typeof options === "string" ? options : JSON.stringify(options)) : null;

        // Create the question
        const newQuestion = await Question.create({
            subject_title_id,
            subject_id,
            class: classLevel,
            board_id,
            question,
            answer,
            solution,
            type,
            options: formattedOptions, 
            image_url,
        });

        res.status(201).json({ message: 'Question added successfully', question: newQuestion });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Edit an existing question
exports.editQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { subject_title_id, subject_id, class: classLevel, board_id, question, answer, solution, type, options } = req.body;

        const existingQuestion = await Question.findByPk(id);
        if (!existingQuestion) return res.status(404).json({ message: 'Question not found' });

        const image_url = req.file ? `/uploads/${req.file.filename}` : existingQuestion.image_url; // Keep old image if new not provided

        await existingQuestion.update({
            subject_title_id,
            subject_id,
            class: classLevel,
            board_id,
            question,
            answer,
            solution,
            type,
            options: JSON.stringify(options), // Store options as a string
            image_url,
        });

        res.status(200).json({ message: 'Question updated successfully', question: existingQuestion });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Delete a question
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

// Get all questions
exports.getAllQuestions = async (req, res) => {
    try {
        const questions = await Question.findAll();
        res.status(200).json(questions.length ? questions : []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
