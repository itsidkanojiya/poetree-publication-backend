const Question = require("../models/Question");
const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");
const { Subject, SubjectTitle, Boards } = require("../models/Subjects");
Question.belongsTo(Subject, { foreignKey: "subject_id", as: "subject" });
Question.belongsTo(SubjectTitle, {
  foreignKey: "subject_title_id",
  as: "subject_title",
});
Question.belongsTo(Boards, { foreignKey: "board_id", as: "board" });
Subject.hasMany(Question, { foreignKey: "subject_id" });
SubjectTitle.hasMany(Question, { foreignKey: "subject_title_id" });
SubjectTitle.hasMany(Question, { foreignKey: "board_id" });
// Add a new question
exports.addQuestion = async (req, res) => {
  try {
    const {
      subject_title_id,
      subject_id,
      standard: standardLevel,
      board_id,
      question,
      answer,
      solution,
      type,
      options,marks
    } = req.body;

        // Validate required fields (answer is optional)
        if (!subject_title_id || !subject_id || !standardLevel || !board_id || !question || !type || !marks) {
            return res.status(400).json({
              error: "Missing required fields",
              required: ["subject_title_id", "subject_id", "standard", "board_id", "question", "type", "marks"]
            });
        }
        const answerTrimmed = answer != null ? String(answer).trim() : null;

        // Validate question type
        if (!['mcq', 'short', 'long', 'blank', 'onetwo', 'truefalse', 'passage', 'match'].includes(type)) {
            return res.status(400).json({ error: "Invalid question type" });
        }

        // Handle options properly
        const formattedOptions = options ? (Array.isArray(options) ? JSON.stringify(options) : options) : null;

        // Get the uploaded image path safely
        const image_url = req.file?.filename ? `uploads/question/${type}/${req.file.filename}` : null;

        // Create the question
        const newQuestion = await Question.create({
            subject_title_id,
            subject_id,
            standard: standardLevel,
            board_id,
            question,
            answer: answerTrimmed || null,
            solution,
            type,marks,
            options: formattedOptions, 
            image_url,  // Save full image path
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
    const body = req.body || {};

    const existingQuestion = await Question.findByPk(id);
    if (!existingQuestion)
      return res.status(404).json({ message: "Question not found" });

    const updates = {};

    if (body.subject_id !== undefined && body.subject_id !== '') updates.subject_id = parseInt(body.subject_id, 10);
    if (body.subject_title_id !== undefined && body.subject_title_id !== '') updates.subject_title_id = parseInt(body.subject_title_id, 10);
    if (body.standard !== undefined && body.standard !== '') updates.standard = parseInt(body.standard, 10);
    if (body.board_id !== undefined && body.board_id !== '') updates.board_id = parseInt(body.board_id, 10);
    if (body.marks !== undefined && body.marks !== '') updates.marks = parseInt(body.marks, 10);
    if (body.question !== undefined) updates.question = String(body.question).trim();
    if (body.type !== undefined && body.type !== '') updates.type = body.type;

    if (body.answer !== undefined) {
      updates.answer = body.answer != null && String(body.answer).trim() !== '' ? String(body.answer).trim() : null;
    }
    if (body.solution !== undefined) {
      updates.solution = body.solution != null && String(body.solution).trim() !== '' ? String(body.solution).trim() : null;
    }
    if (body.options !== undefined) {
      updates.options = body.options != null
        ? (Array.isArray(body.options) ? JSON.stringify(body.options) : body.options)
        : null;
    }

    if (req.file) {
      const rootDir = path.resolve(__dirname, "..", "..");
      const oldImagePath = existingQuestion.image_url ? path.join(rootDir, existingQuestion.image_url) : null;
      if (oldImagePath && fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
      const type = body.type || existingQuestion.type;
      updates.image_url = `uploads/question/${type}/${req.file.filename}`;
    }

    if (Object.keys(updates).length > 0) {
      await existingQuestion.update(updates);
    }

    const updated = await Question.findByPk(id);
    res.status(200).json({
      message: "Question updated successfully",
      question: updated,
    });
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
    if (!question)
      return res.status(404).json({ message: "Question not found" });

    // If the question has an image, delete it from the server
    if (question.image_url) {
      // Get the absolute path of the 'uploads' folder at the project root
      const rootDir = path.resolve(__dirname, "..", ".."); // Move up TWO levels from src
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
    res
      .status(200)
      .json({ message: "Question and image deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.getAllQuestions = async (req, res) => {
  try {
    const { 
      subject_id, 
      subject_title_id,
      standard, 
      board_id, 
      type, 
      marks 
    } = req.query;

    // Build query dynamically with support for arrays
    const query = {};
    
    // Filter by subject_id (supports single value or comma-separated values)
    if (subject_id) {
      const subjectIds = Array.isArray(subject_id) 
        ? subject_id 
        : subject_id.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (subjectIds.length === 1) {
        query.subject_id = subjectIds[0];
      } else if (subjectIds.length > 1) {
        query.subject_id = { [Op.in]: subjectIds };
      }
    }

    // Filter by subject_title_id (supports single value or comma-separated values)
    if (subject_title_id) {
      const subjectTitleIds = Array.isArray(subject_title_id)
        ? subject_title_id
        : subject_title_id.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (subjectTitleIds.length === 1) {
        query.subject_title_id = subjectTitleIds[0];
      } else if (subjectTitleIds.length > 1) {
        query.subject_title_id = { [Op.in]: subjectTitleIds };
      }
    }

    // Filter by standard (std) - supports single value or comma-separated values
    if (standard) {
      const standards = Array.isArray(standard)
        ? standard
        : standard.split(',').map(std => parseInt(std.trim())).filter(std => !isNaN(std));
      if (standards.length === 1) {
        query.standard = standards[0];
      } else if (standards.length > 1) {
        query.standard = { [Op.in]: standards };
      }
    }

    // Filter by board_id (supports single value or comma-separated values)
    if (board_id) {
      const boardIds = Array.isArray(board_id)
        ? board_id
        : board_id.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (boardIds.length === 1) {
        query.board_id = boardIds[0];
      } else if (boardIds.length > 1) {
        query.board_id = { [Op.in]: boardIds };
      }
    }

    // Filter by question type (supports single value or comma-separated values)
    if (type) {
      const types = Array.isArray(type)
        ? type
        : type.split(',').map(t => t.trim()).filter(t => t);
      if (types.length === 1) {
        query.type = types[0];
      } else if (types.length > 1) {
        query.type = { [Op.in]: types };
      }
    }

    // Filter by marks (supports single value or comma-separated values)
    if (marks) {
      const marksArray = Array.isArray(marks)
        ? marks
        : marks.split(',').map(m => parseInt(m.trim())).filter(m => !isNaN(m));
      if (marksArray.length === 1) {
        query.marks = marksArray[0];
      } else if (marksArray.length > 1) {
        query.marks = { [Op.in]: marksArray };
      }
    }

    console.log('[getAllQuestions] Query filters:', JSON.stringify(query, null, 2));

    const questions = await Question.findAll({
      attributes: [
        "question_id",
        "subject_id",
        "subject_title_id",
        "standard",
        "question",
        "answer",
        "solution",
        "type",
        "options",
        "image_url",
        "marks",
        "board_id"
      ],
      where: query, // Apply filters here
      include: [
        {
          model: Subject,
          as: "subject",
          attributes: ["subject_id", "subject_name"],
        },
        {
          model: SubjectTitle,
          as: "subject_title",
          attributes: ["subject_title_id", "title_name"],
        },
        {
          model: Boards,
          as: "board",
          attributes: ["board_id", "board_name"],
        },
      ],
    });

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    // Flatten the response and ensure full image URLs
    const formattedQuestions = questions.map((q) => {
      const questionData = q.toJSON();
      
      // Parse options if it's a JSON string
      let parsedOptions = null;
      if (questionData.options) {
        try {
          parsedOptions = typeof questionData.options === 'string' 
            ? JSON.parse(questionData.options) 
            : questionData.options;
        } catch (e) {
          console.warn('[getAllQuestions] Failed to parse options:', e.message);
          parsedOptions = questionData.options;
        }
      }

      return {
        question_id: questionData.question_id,
        subject_id: questionData.subject_id,
        subject_title_id: questionData.subject_title_id,
        standard: questionData.standard,
        question: questionData.question,
        answer: questionData.answer,
        solution: questionData.solution,
        type: questionData.type,
        options: parsedOptions,
        marks: questionData.marks, // Already an integer, no need to parse
        board_id: questionData.board_id,
        subject: q.subject ? {
          subject_id: q.subject.subject_id,
          subject_name: q.subject.subject_name
        } : null,
        subject_title: q.subject_title ? {
          subject_title_id: q.subject_title.subject_title_id,
          title_name: q.subject_title.title_name
        } : null,
        board: q.board ? {
          board_id: q.board.board_id,
          board_name: q.board.board_name
        } : null,
        image_url: questionData.image_url ? `${baseUrl}/${questionData.image_url}` : null,
      };
    });

    res.status(200).json({
      success: true,
      count: formattedQuestions.length,
      questions: formattedQuestions
    });
  } catch (err) {
    console.error('[getAllQuestions] Error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

exports.questionAnalysis = async (req, res) => {
  try {
    const total = await Question.count();
    const mcq = await Question.count({ where: { type: "mcq" } });
    const long = await Question.count({ where: { type: "long" } });
    const short = await Question.count({ where: { type: "short" } });
    const truefalse = await Question.count({ where: { type: "truefalse" } });
    const blank = await Question.count({ where: { type: "blank" } });
    const onetwo = await Question.count({ where: { type: "onetwo" } });

    res.json({
      total,
      mcq,
      long,
      short,
      truefalse,
      blank,
      onetwo,
    });
  } catch (error) {
    console.error("Error fetching question statistics:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
