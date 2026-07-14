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
const { resolveStandardId } = require("../helpers/resolveStandardId");
const {
  sanitizeQuestionHtml,
  sanitizeOptionsHtml,
  htmlToPlain,
  optionsHtmlToPlain,
} = require("../utils/richText");

const ALLOWED_DIFFICULTY = ["easy", "medium", "hard"];

/**
 * Rich-text ("Word-like") fields for a write.
 *
 * When a *_html field is present it is AUTHORITATIVE: it is sanitized, stored, and
 * the plain-text sibling is regenerated from it. That keeps `question`/`options`/
 * `solution` tag-free for the consumers that cannot render HTML (the pdf-lib quiz
 * PDF and the live-quiz payload), and guarantees the two can never drift.
 *
 * options_html only applies where the plain `options` is a FLAT string array (MCQ).
 * `match` ({left,right}) and `passage` (sub-question objects) keep their own shapes.
 *
 * @returns {{question_html?, question?, solution_html?, solution?, options_html?, optionsPlain?}}
 */
function resolveRichFields(body, type) {
  const out = {};

  const qHtml = sanitizeQuestionHtml(body.question_html);
  if (qHtml) {
    out.question_html = qHtml;
    out.question = htmlToPlain(qHtml);
  }

  const sHtml = sanitizeQuestionHtml(body.solution_html);
  if (sHtml) {
    out.solution_html = sHtml;
    out.solution = htmlToPlain(sHtml);
  }

  if (type !== "passage" && type !== "match") {
    const oHtml = sanitizeOptionsHtml(body.options_html);
    if (oHtml && oHtml.length) {
      out.options_html = JSON.stringify(oHtml);
      out.optionsPlain = optionsHtmlToPlain(oHtml); // flat string[] — never objects
    }
  }

  return out;
}

function normalizeDifficultyValue(d) {
  if (d == null || d === "") return "medium";
  const x = String(d).toLowerCase();
  return ALLOWED_DIFFICULTY.includes(x) ? x : "medium";
}

const ROOT_DIR = path.resolve(__dirname, "..", "..");

/** Delete a relative upload path from disk if it exists (best-effort). */
function unlinkUpload(relPath) {
  if (!relPath) return;
  try {
    const abs = path.join(ROOT_DIR, relPath);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch (e) {
    console.warn("[question] failed to unlink", relPath, e.message);
  }
}

/**
 * Build the image-related columns from an uploaded question request.
 * Reads req.files (upload.fields) for `image`, `composite_image`, `images[]`/`images`
 * and the scalar layout fields from req.body. Returns only the keys that are present
 * so it can be spread into create()/update() without clobbering existing values.
 */
function buildImageFields(req, type) {
  const files = req.files || {};
  const body = req.body || {};
  const out = {};
  const dir = `uploads/question/${type}`;

  const legacy = files.image && files.image[0];
  if (legacy) out.image_url = `${dir}/${legacy.filename}`;

  const composite = files.composite_image && files.composite_image[0];
  if (composite) out.composite_image_url = `${dir}/${composite.filename}`;

  const sources = files["images[]"] || files.images || [];
  if (sources.length > 0) {
    out.images = JSON.stringify(sources.map((f) => `${dir}/${f.filename}`));
  }

  if (body.image_layout !== undefined)
    out.image_layout = body.image_layout || null;
  if (body.image_placement !== undefined)
    out.image_placement = body.image_placement || null;
  if (body.image_align !== undefined)
    out.image_align = body.image_align || null;
  if (body.composite_width !== undefined && body.composite_width !== "")
    out.composite_width = parseInt(body.composite_width, 10) || null;
  if (body.composite_height !== undefined && body.composite_height !== "")
    out.composite_height = parseInt(body.composite_height, 10) || null;

  return out;
}

/** Fully clear the composite/multi-image columns (used on removal). */
function clearedImageFields() {
  return {
    images: null,
    image_layout: null,
    composite_image_url: null,
    composite_width: null,
    composite_height: null,
    image_placement: null,
    image_align: null,
  };
}

/** Collect all on-disk file paths a question references (for cleanup). */
function collectQuestionFiles(question) {
  const paths = [];
  if (question.image_url) paths.push(question.image_url);
  if (question.composite_image_url) paths.push(question.composite_image_url);
  if (question.images) {
    try {
      const arr = JSON.parse(question.images);
      if (Array.isArray(arr)) paths.push(...arr.filter(Boolean));
    } catch { /* ignore malformed */ }
  }
  return paths;
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

        // Rich mode sends question_html and no plain `question` — derive the plain
        // mirror first so the required-field check below sees it.
        const rich = resolveRichFields(req.body, type);
        const questionText = rich.question ?? question;
        const solutionText = rich.solution ?? solution;

        // Validate required fields (answer is optional)
        if (!subject_title_id || !subject_id || !standardLevel || !board_id || !questionText || !type || !marks) {
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
        } else if (rich.optionsPlain) {
            // Rich MCQ: options are derived from options_html so the two stay aligned.
            formattedOptions = JSON.stringify(rich.optionsPlain);
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

        // Uploaded image(s): legacy single image, fabric composite PNG, and/or
        // multiple source images, plus the layout/placement scalars.
        const imageFields = buildImageFields(req, type);

        // Normalize standard to the canonical standard_id (accepts id or grade name)
        const standardId = await resolveStandardId(standardLevel);

        // Create the question
        const newQuestion = await Question.create({
            subject_title_id,
            subject_id,
            standard: standardId,
            board_id,
            chapter_id: chapterIdNum,
            question: questionText,
            answer: answerToStore,
            solution: solutionText,
            type,
            marks,
            difficulty: difficultyNorm,
            options: formattedOptions,
            // Rich-text siblings (null when the question was authored in simple mode)
            question_html: rich.question_html ?? null,
            options_html: rich.options_html ?? null,
            solution_html: rich.solution_html ?? null,
            ...imageFields, // image_url, composite_image_url, images, layout, placement, align, dims
        });

        res.status(201).json({ message: 'Question added successfully', question: newQuestion });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST /api/question/upload-image  (admin, multipart: `image` + `type`)
 * Uploads a single image for the rich-text editor and returns its relative URL, so
 * inline images are referenced by URL instead of being embedded as base64 (which
 * would bloat every question row and is rejected by the sanitizer).
 */
exports.uploadInlineImage = async (req, res) => {
  try {
    const file = req.file || (req.files && req.files.image && req.files.image[0]);
    if (!file) {
      return res.status(400).json({ error: "No image uploaded (field name: image)" });
    }
    const type = req.body.type;
    const url = `uploads/question/${type}/${file.filename}`;
    return res.status(201).json({ success: true, url });
  } catch (err) {
    console.error("[uploadInlineImage]", err);
    return res.status(500).json({ error: err.message });
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
    if (body.standard !== undefined && body.standard !== '') updates.standard = await resolveStandardId(body.standard);
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

    // Rich-text body. Applied AFTER the plain fields because *_html is authoritative:
    // it is sanitized and the plain sibling is regenerated from it, so the two can
    // never drift (the pdf-lib PDF and live quiz read the plain columns).
    const rich = resolveRichFields(body, effectiveType);
    if (rich.question_html) {
      updates.question_html = rich.question_html;
      updates.question = rich.question;
    }
    if (rich.solution_html) {
      updates.solution_html = rich.solution_html;
      updates.solution = rich.solution;
    }
    if (rich.options_html) {
      updates.options_html = rich.options_html;
      updates.options = JSON.stringify(rich.optionsPlain);
    }
    // Switching back to the simple editor drops the rich bodies; plain text remains.
    if (body.clear_rich === "true" || body.clear_rich === true) {
      updates.question_html = null;
      updates.options_html = null;
      updates.solution_html = null;
    }

    const effectiveTypeForImage = body.type || existingQuestion.type;

    // Explicit removal of the composite / multi-image block (keeps legacy image_url).
    if (body.clear_images === "true" || body.clear_images === true) {
      collectQuestionFiles({
        composite_image_url: existingQuestion.composite_image_url,
        images: existingQuestion.images,
      }).forEach(unlinkUpload);
      Object.assign(updates, clearedImageFields());
    }

    // New/replacement uploads. Delete the files being replaced before overwriting.
    const imageFields = buildImageFields(req, effectiveTypeForImage);
    if (imageFields.image_url) unlinkUpload(existingQuestion.image_url);
    if (imageFields.composite_image_url) unlinkUpload(existingQuestion.composite_image_url);
    if (imageFields.images) {
      collectQuestionFiles({ images: existingQuestion.images }).forEach(unlinkUpload);
    }
    Object.assign(updates, imageFields);

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

    // Delete all image files this question references (legacy + composite + sources)
    collectQuestionFiles(question).forEach(unlinkUpload);

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

exports.bulkDeleteQuestions = async (req, res) => {
  try {
    const { ids } = req.body;

    // Validate non-empty array of ids
    if (!Array.isArray(ids) || ids.length === 0) {
      return res
        .status(400)
        .json({ error: "ids must be a non-empty array" });
    }

    // Fetch the rows to delete
    const questions = await Question.findAll({
      where: { question_id: { [Op.in]: ids } },
    });

    // Delete each question's image files (legacy + composite + sources)
    for (const question of questions) {
      collectQuestionFiles(question).forEach(unlinkUpload);
    }

    // Bulk-remove the rows from the database
    const deletedCount = await Question.destroy({
      where: { question_id: { [Op.in]: ids } },
    });

    res.status(200).json({ deletedCount, requested: ids.length });
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
        "question_html",
        "options_html",
        "solution_html",
        "image_url",
        "images",
        "image_layout",
        "composite_image_url",
        "composite_width",
        "composite_height",
        "image_placement",
        "image_align",
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
        // Rich-text bodies (null for questions authored in simple mode). Clients that
        // can render HTML prefer these; everything else falls back to the plain fields.
        question_html: questionData.question_html || null,
        solution_html: questionData.solution_html || null,
        options_html: (() => {
          if (!questionData.options_html) return null;
          try {
            return typeof questionData.options_html === "string"
              ? JSON.parse(questionData.options_html)
              : questionData.options_html;
          } catch {
            return null;
          }
        })(),
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
        // Fabric composite image block
        composite_image_url: questionData.composite_image_url
          ? `${baseUrl}/${questionData.composite_image_url}`
          : null,
        images: (() => {
          if (!questionData.images) return [];
          try {
            const arr = JSON.parse(questionData.images);
            return Array.isArray(arr)
              ? arr.filter(Boolean).map((p) => `${baseUrl}/${p}`)
              : [];
          } catch {
            return [];
          }
        })(),
        image_layout: questionData.image_layout || null,
        composite_width: questionData.composite_width ?? null,
        composite_height: questionData.composite_height ?? null,
        image_placement: questionData.image_placement || null,
        image_align: questionData.image_align || null,
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
    const passage = await Question.count({ where: { type: "passage" } });
    const match = await Question.count({ where: { type: "match" } });

    res.json({
      total,
      mcq,
      long,
      short,
      truefalse,
      blank,
      onetwo,
      passage,
      match,
    });
  } catch (error) {
    console.error("Error fetching question statistics:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
