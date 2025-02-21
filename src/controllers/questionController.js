const Question = require('../models/Question');
const fs = require('fs');
const path = require('path');
const {Subject,SubjectTitle, Boards} = require('../models/Subjects');
Question.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });
Question.belongsTo(SubjectTitle, { foreignKey: 'subject_title_id', as: 'subject_title' });
Question.belongsTo(Boards, { foreignKey: 'board_id', as: 'board' });
Subject.hasMany(Question, { foreignKey: 'subject_id' });
SubjectTitle.hasMany(Question, { foreignKey: 'subject_title_id' });
SubjectTitle.hasMany(Question, { foreignKey: 'board_id' });
// Add a new question
exports.addQuestion = async (req, res) => {
    try {
        const { subject_title_id, subject_id, standard: standardLevel, board_id, question, answer, solution, type, options } = req.body;

        if (!subject_title_id || !subject_id || !standardLevel || !board_id || !question || !answer || !type) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (!['mcq', 'short', 'long', 'blank', 'onetwo'].includes(type)) {
            return res.status(400).json({ error: "Invalid question type" });
        }

        // Ensure `options` are stored correctly
        const formattedOptions = options ? (typeof options === "string" ? options : JSON.stringify(options)) : null;

        // Get the uploaded image path
        const image_url = req.file ? `uploads/question/${type}/${req.file.filename}` : null;

        // Create the question
        const newQuestion = await Question.create({
            subject_title_id,
            subject_id,
            standard: standardLevel,
            board_id,
            question,
            answer,
            solution,
            type,
            options: formattedOptions, 
            image_url,  // Save full image URL
        });

        res.status(201).json({ message: 'Question added successfully', question: newQuestion });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.editQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { subject_title_id, subject_id, standard: standardLevel, board_id, question, answer, solution, type, options } = req.body;

        // Find the existing question
        const existingQuestion = await Question.findByPk(id);
        if (!existingQuestion) return res.status(404).json({ message: 'Question not found' });

        let image_url = existingQuestion.image_url; // Keep old image if new not provided

        // If a new image is uploaded, delete the old one and update the path
        if (req.file) {
            // Get the absolute path of the 'uploads' folder
            const rootDir = path.resolve(__dirname, '..', '..');
            const oldImagePath = path.join(rootDir, existingQuestion.image_url);

            // Delete the old image if it exists
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
                console.log(`✅ Deleted old image: ${oldImagePath}`);
            }

            // Set new image URL
            image_url = `/uploads/question/${type}/${req.file.filename}`;
        }

        // Update the question
        await existingQuestion.update({
            subject_title_id,
            subject_id,
            standard: standardLevel,
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
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};


exports.deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the question by ID
        const question = await Question.findByPk(id);
        if (!question) return res.status(404).json({ message: 'Question not found' });

        // If the question has an image, delete it from the server
        if (question.image_url) {
            // Get the absolute path of the 'uploads' folder at the project root
            const rootDir = path.resolve(__dirname, '..', '..'); // Move up TWO levels from src
            const imagePath = path.join(rootDir, question.image_url);

            // Check if the file exists before deleting
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
                console.log(`✅ Deleted file: ${imagePath}`);
            } else {
                console.log(`❌ File not found: ${imagePath}`);
            }
        }

        // Delete the question from the database
        await question.destroy();
        res.status(200).json({ message: 'Question and image deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};




exports.getAllQuestions = async (req, res) => {
    try {
        const { subject_id, standard: standardLevel, board_id, type } = req.query;

        // Build query dynamically
        const query = {};
        if (subject_id) query.subject_id = subject_id;
        if (standardLevel) query.standard = standardLevel;
        if (board_id) query.board_id = board_id;
        if (type) query.type = type;

        const questions = await Question.findAll({
            attributes: ['question_id', 'standard', 'question', 'answer', 'solution', 'type', 'options', 'image_url'],
            where: query, // Apply filters here
            include: [
                {
                    model: Subject,
                    as: 'subject',
                    attributes: ['subject_name'],
                },
                {
                    model: SubjectTitle,
                    as: 'subject_title',
                    attributes: ['title_name'],
                },
                {
                    model: Boards,
                    as: 'board',
                    attributes: ['board_name'],
                },
            ]
        });

        const baseUrl = `${req.protocol}://${req.get('host')}`; // Example: http://localhost:5000

        // Flatten the response and ensure full image URLs
        const formattedQuestions = questions.map(q => ({
            ...q.toJSON(),
            subject: q.subject ? q.subject.subject_name : null,
            subject_title: q.subject_title ? q.subject_title.title_name : null,
            board: q.board ? q.board.board_name : null,
            options: q.options ? JSON.parse(q.options) : null, // Parse options if stored as JSON
            image_url: q.image_url ? `${baseUrl}${q.image_url}` : null // Convert relative path to full URL
        }));

        res.status(200).json(formattedQuestions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};


