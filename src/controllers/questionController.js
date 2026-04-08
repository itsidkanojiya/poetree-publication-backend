const Question = require("../models/Question");
const Chapter = require("../models/Chapter");
const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");
const { Subject, SubjectTitle, Boards } = require("../models/Subjects");
const {
  normalizeQuestionType,
  SECTION_WEIGHT_KEYS,
} = require("../services/smartPaperPropose");

const ALLOWED_DIFFICULTY = ["easy", "medium", "hard"];

function normalizeDifficultyValue(d) {
  if (d == null || d === "") return "medium";
  const x = String(d).toLowerCase();
  return ALLOWED_DIFFICULTY.includes(x) ? x : "medium";
}
Question.belongsTo(Subject, { foreignKey: "subject_id", as: "subject" });
Question.belongsTo(SubjectTitle, {
  foreignKey: "subject_title_id",
  as: "subject_title",
});
Question.belongsTo(Boards, { foreignKey: "board_id", as: "board" });
Question.belongsTo(Chapter, { foreignKey: "chapter_id", as: "chapter" });
Subject.hasMany(Question, { foreignKey: "subject_id" });
SubjectTitle.hasMany(Question, { foreignKey: "subject_title_id" });
SubjectTitle.hasMany(Question, { foreignKey: "board_id" });

/**
 * Validate and normalize passage options. Each item can be:
 * - Short-answer: { "question": "...", "answer": "..." } or { "type": "short", "question": "...", "answer": "..." }
 * - MCQ: { "type": "mcq", "question": "...", "options": ["A", "B", ...], "answer": "1" } (1-based index)
 * Missing "type" is treated as "short" (backward compatible).
 * @returns {{ valid: boolean, error?: string, normalized?: array }}
 */
function validatePassageOptions(options) {
  if (!Array.isArray(options)) return { valid: false, error: "Passage options must be an array" };
  const normalized = [];
  for (let i = 0; i < options.length; i++) {
    const item = options[i];
    if (!item || typeof item !== "object") return { valid: false, error: `Passage option ${i + 1} must be an object` };
    const type = item.type === "mcq" ? "mcq" : "short"; // no type or "short" -> short
    if (type === "mcq") {
      if (typeof item.question !== "string" || !Array.isArray(item.options))
        return { valid: false, error: `Passage MCQ item ${i + 1} must have "question" (string) and "options" (array)` };
      if (item.answer === undefined || item.answer === null)
        return { valid: false, error: `Passage MCQ item ${i + 1} must have "answer" (1-based index string)` };
      normalized.push({
        type: "mcq",
        question: String(item.question).trim(),
        options: item.options.map((o) => String(o)),
        answer: item.answer != null ? String(item.answer) : "",
      });
    } else {
      if (typeof item.question !== "string")
        return { valid: false, error: `Passage short-answer item ${i + 1} must have "question" (string)` };
      normalized.push({
        type: "short",
        question: String(item.question).trim(),
        answer: item.answer != null ? String(item.answer).trim() : "",
      });
    }
  }
  return { valid: true, normalized };
}

/**
 * Validate passage answer object: { q1: "...", q2: "1", ... }. Values are text (short) or option index string (MCQ).
 */
function validatePassageAnswer(answer) {
  if (answer == null) return { valid: true };
  if (typeof answer !== "object" || Array.isArray(answer)) return { valid: false, error: "Passage answer must be an object" };
  for (const key of Object.keys(answer)) {
    if (typeof answer[key] !== "string" && typeof answer[key] !== "number")
      return { valid: false, error: `Passage answer value for "${key}" must be string or number` };
  }
  return { valid: true };
}

// Add a new question
exports.addQuestion = async (req, res) => {
  try {
    const {
      subject_title_id,
      subject_id,
      standard: standardLevel,
      board_id,
      chapter_id,
      question,
      answer,
      solution,
      type,
      options,
      marks,
      difficulty,
    } = req.body;

        // Validate required fields (answer is optional)
        if (!subject_title_id || !subject_id || !standardLevel || !board_id || !question || !type || !marks) {
            return res.status(400).json({
              error: "Missing required fields",
              required: ["subject_title_id", "subject_id", "standard", "board_id", "question", "type", "marks"]
            });
        }
        if (difficulty === undefined || difficulty === null || String(difficulty).trim() === "") {
            return res.status(400).json({
              error: "difficulty is required",
              allowed: ALLOWED_DIFFICULTY,
            });
        }
        const difficultyNorm = String(difficulty).toLowerCase();
        if (!ALLOWED_DIFFICULTY.includes(difficultyNorm)) {
            return res.status(400).json({
              error: "Invalid difficulty; use easy, medium, or hard",
              allowed: ALLOWED_DIFFICULTY,
            });
        }
        if (!chapter_id) {
            return res.status(400).json({ error: "chapter_id is required" });
        }
        const chapterIdNum = parseInt(chapter_id, 10);
        if (isNaN(chapterIdNum)) {
            return res.status(400).json({ error: "chapter_id must be a number" });
        }
        const chapter = await Chapter.findByPk(chapterIdNum);
        if (!chapter) {
            return res.status(404).json({ error: "Chapter not found" });
        }
        if (chapter.subject_title_id !== parseInt(subject_title_id, 10)) {
            return res.status(400).json({ error: "Chapter does not belong to the selected subject title" });
        }
        // Validate question type
        if (!['mcq', 'short', 'long', 'blank', 'onetwo', 'truefalse', 'passage', 'match'].includes(type)) {
            return res.status(400).json({ error: "Invalid question type" });
        }

        // Passage: validate and normalize options (short + MCQ sub-questions)
        let formattedOptions = null;
        if (type === "passage" && options != null) {
            const opts = Array.isArray(options) ? options : (typeof options === "string" ? (() => { try { return JSON.parse(options); } catch { return null; } })() : null);
            if (!Array.isArray(opts)) {
                return res.status(400).json({ error: "Passage questions require options to be an array" });
            }
            const result = validatePassageOptions(opts);
            if (!result.valid) return res.status(400).json({ error: result.error });
            formattedOptions = JSON.stringify(result.normalized);
        } else {
            formattedOptions = options ? (Array.isArray(options) ? JSON.stringify(options) : options) : null;
        }

        // Passage: answer can be object { q1: "...", q2: "1", ... }; store as JSON string
        let answerToStore = null;
        if (type === "passage" && answer != null) {
            let answerObj = answer;
            if (typeof answer === "string") {
                try { answerObj = JSON.parse(answer); } catch { answerObj = null; }
            }
            if (answerObj && typeof answerObj === "object" && !Array.isArray(answerObj)) {
                const pa = validatePassageAnswer(answerObj);
                if (!pa.valid) return res.status(400).json({ error: pa.error });
                answerToStore = JSON.stringify(answerObj);
            } else {
                answerToStore = String(answer).trim() || null;
            }
        } else {
            answerToStore = answer != null ? String(answer).trim() : null;
        }

        // Get the uploaded image path safely
        const image_url = req.file?.filename ? `uploads/question/${type}/${req.file.filename}` : null;

        // Create the question
        const newQuestion = await Question.create({
            subject_title_id,
            subject_id,
            standard: standardLevel,
            board_id,
            chapter_id: chapterIdNum,
            question,
            answer: answerToStore,
            solution,
            type,
            marks,
            difficulty: difficultyNorm,
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
    if (body.difficulty !== undefined && body.difficulty !== "") {
      const d = String(body.difficulty).toLowerCase();
      if (!ALLOWED_DIFFICULTY.includes(d)) {
        return res.status(400).json({
          error: "Invalid difficulty; use easy, medium, or hard",
          allowed: ALLOWED_DIFFICULTY,
        });
      }
      updates.difficulty = d;
    }
    if (body.chapter_id !== undefined) {
      if (body.chapter_id === null || body.chapter_id === '') {
        updates.chapter_id = null;
      } else {
        const cid = parseInt(body.chapter_id, 10);
        if (isNaN(cid)) {
          return res.status(400).json({ error: "chapter_id must be a number" });
        }
        const chapter = await Chapter.findByPk(cid);
        if (!chapter) return res.status(404).json({ error: "Chapter not found" });
        const stId = body.subject_title_id !== undefined ? parseInt(body.subject_title_id, 10) : existingQuestion.subject_title_id;
        if (chapter.subject_title_id !== stId) {
          return res.status(400).json({ error: "Chapter does not belong to the selected subject title" });
        }
        updates.chapter_id = cid;
      }
    }
    if (body.question !== undefined) updates.question = String(body.question).trim();
    if (body.type !== undefined && body.type !== '') updates.type = body.type;

    const effectiveType = body.type !== undefined ? body.type : existingQuestion.type;
    if (body.answer !== undefined) {
      if (effectiveType === "passage" && body.answer != null) {
        let answerObj = body.answer;
        if (typeof body.answer === "string") {
          try { answerObj = JSON.parse(body.answer); } catch { answerObj = null; }
        }
        if (answerObj && typeof answerObj === "object" && !Array.isArray(answerObj)) {
          const pa = validatePassageAnswer(answerObj);
          if (!pa.valid) return res.status(400).json({ error: pa.error });
          updates.answer = JSON.stringify(answerObj);
        } else {
          updates.answer = String(body.answer).trim() || null;
        }
      } else {
        updates.answer = body.answer != null && String(body.answer).trim() !== '' ? String(body.answer).trim() : null;
      }
    }
    if (body.solution !== undefined) {
      updates.solution = body.solution != null && String(body.solution).trim() !== '' ? String(body.solution).trim() : null;
    }
    if (body.options !== undefined) {
      if (effectiveType === "passage" && body.options != null) {
        const opts = Array.isArray(body.options) ? body.options : (typeof body.options === "string" ? (() => { try { return JSON.parse(body.options); } catch { return null; } })() : null);
        if (!Array.isArray(opts)) {
          return res.status(400).json({ error: "Passage options must be an array" });
        }
        const result = validatePassageOptions(opts);
        if (!result.valid) return res.status(400).json({ error: result.error });
        updates.options = JSON.stringify(result.normalized);
      } else {
        updates.options = body.options != null
          ? (Array.isArray(body.options) ? JSON.stringify(body.options) : body.options)
          : null;
      }
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
      marks,
      chapter_id,
      difficulty,
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

    // Filter by chapter_id (supports single value or comma-separated values)
    if (chapter_id) {
      const chapterIds = Array.isArray(chapter_id)
        ? chapter_id
        : chapter_id.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (chapterIds.length === 1) {
        query.chapter_id = chapterIds[0];
      } else if (chapterIds.length > 1) {
        query.chapter_id = { [Op.in]: chapterIds };
      }
    }

    // Filter by difficulty (easy, medium, hard — comma-separated)
    if (difficulty) {
      const diffs = Array.isArray(difficulty)
        ? difficulty
        : difficulty.split(',').map((d) => d.trim().toLowerCase()).filter((d) => d);
      const valid = diffs.filter((d) => ALLOWED_DIFFICULTY.includes(d));
      if (valid.length === 1) {
        query.difficulty = valid[0];
      } else if (valid.length > 1) {
        query.difficulty = { [Op.in]: valid };
      }
    }

    console.log('[getAllQuestions] Query filters:', JSON.stringify(query, null, 2));

    const questions = await Question.findAll({
      attributes: [
        "question_id",
        "subject_id",
        "subject_title_id",
        "standard",
        "chapter_id",
        "question",
        "answer",
        "solution",
        "type",
        "difficulty",
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
        {
          model: Chapter,
          as: "chapter",
          attributes: ["chapter_id", "chapter_name"],
          required: false,
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

      // Passage: answer is stored as JSON object string; return parsed object so frontend can render
      let answerOut = questionData.answer;
      if (questionData.type === 'passage' && typeof questionData.answer === 'string' && questionData.answer.trim().startsWith('{')) {
        try {
          answerOut = JSON.parse(questionData.answer);
        } catch (e) {
          answerOut = questionData.answer;
        }
      }

      return {
        question_id: questionData.question_id,
        subject_id: questionData.subject_id,
        subject_title_id: questionData.subject_title_id,
        standard: questionData.standard,
        chapter_id: questionData.chapter_id,
        question: questionData.question,
        answer: answerOut,
        solution: questionData.solution,
        type: questionData.type,
        difficulty: normalizeDifficultyValue(questionData.difficulty),
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
        chapter: q.chapter ? {
          chapter_id: q.chapter.chapter_id,
          chapter_name: q.chapter.chapter_name
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

exports.getQuestionStats = async (req, res) => {
  try {
    const { subject_title_id, board_id, standard } = req.query;
    const st = subject_title_id != null ? parseInt(subject_title_id, 10) : NaN;
    const bd = board_id != null ? parseInt(board_id, 10) : NaN;
    const std = standard != null ? parseInt(standard, 10) : NaN;
    if (isNaN(st) || isNaN(bd) || isNaN(std)) {
      return res.status(400).json({
        success: false,
        error: "subject_title_id, board_id, and standard are required as numbers",
      });
    }

    const baseWhere = { subject_title_id: st, board_id: bd, standard: std };

    const rows = await Question.findAll({
      attributes: ["difficulty", "type", "chapter_id"],
      where: baseWhere,
      raw: true,
    });

    const by_difficulty = { easy: 0, medium: 0, hard: 0 };
    const by_type = Object.fromEntries(SECTION_WEIGHT_KEYS.map((k) => [k, 0]));
    const chapterCount = {};

    for (const r of rows) {
      const d = normalizeDifficultyValue(r.difficulty);
      if (by_difficulty[d] !== undefined) by_difficulty[d]++;
      const ct = normalizeQuestionType(r.type);
      if (ct && Object.prototype.hasOwnProperty.call(by_type, ct)) {
        by_type[ct]++;
      }
      const ch = r.chapter_id;
      if (ch != null) {
        chapterCount[ch] = (chapterCount[ch] || 0) + 1;
      }
    }

    const by_chapter = Object.keys(chapterCount)
      .map((id) => ({ chapter_id: parseInt(id, 10), count: chapterCount[id] }))
      .sort((a, b) => a.chapter_id - b.chapter_id);

    return res.status(200).json({
      success: true,
      by_difficulty,
      by_type,
      by_chapter,
    });
  } catch (err) {
    console.error("[getQuestionStats]", err);
    res.status(500).json({ success: false, error: err.message });
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
