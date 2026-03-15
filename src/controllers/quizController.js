const { Op } = require('sequelize');
const Paper = require('../models/Paper');
const Question = require('../models/Question');
const User = require('../models/User');
const quizPdfService = require('../services/quizPdfService');

/** Check if current user can access this paper (quiz). Teacher: own only; Admin: any. */
function canAccessQuiz(paper, user) {
  if (!user) return false;
  const userId = user.id ?? user.user_id;
  if (user.user_type === 'admin') return true;
  return Number(paper.user_id) === Number(userId);
}

/**
 * Parse paper.body (JSON array of question IDs) and return array of IDs in order.
 */
function getQuestionIdsFromPaper(paper) {
  let body = paper.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(body)) return [];
  return body.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
}

/**
 * GET /api/quiz/suggest-mcq
 * Query: subject_id, subject_title_id, chapter_id, standard, board_id, count
 * Returns MCQ questions matching filters (for teacher to pick).
 */
exports.suggestMcq = async (req, res) => {
  try {
    const {
      subject_id,
      subject_title_id,
      chapter_id,
      standard,
      board_id,
      count = 20,
    } = req.query;

    const where = { type: 'mcq' };
    if (subject_id) {
      const id = parseInt(subject_id, 10);
      if (!isNaN(id)) where.subject_id = id;
    }
    if (subject_title_id) {
      const id = parseInt(subject_title_id, 10);
      if (!isNaN(id)) where.subject_title_id = id;
    }
    // chapter_id optional: omit to get questions from all chapters; or use one ID or comma-separated IDs
    if (chapter_id) {
      const chapterIds = Array.isArray(chapter_id)
        ? chapter_id
        : String(chapter_id).split(',').map((id) => parseInt(id.trim(), 10)).filter((id) => !isNaN(id));
      if (chapterIds.length === 1) {
        where.chapter_id = chapterIds[0];
      } else if (chapterIds.length > 1) {
        where.chapter_id = { [Op.in]: chapterIds };
      }
    }
    if (standard) {
      const s = parseInt(standard, 10);
      if (!isNaN(s)) where.standard = s;
    }
    if (board_id) {
      const id = parseInt(board_id, 10);
      if (!isNaN(id)) where.board_id = id;
    }

    const limit = Math.min(Math.max(parseInt(count, 10) || 20, 1), 100);
    const questions = await Question.findAll({
      where,
      limit,
      order: [['question_id', 'ASC']],
      attributes: [
        'question_id',
        'subject_id',
        'subject_title_id',
        'standard',
        'board_id',
        'chapter_id',
        'question',
        'answer',
        'type',
        'options',
        'marks',
      ],
    });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const formatted = questions.map((q) => {
      const d = q.toJSON();
      let options = d.options;
      if (typeof options === 'string') {
        try {
          options = JSON.parse(options);
        } catch {
          options = null;
        }
      }
      return {
        question_id: d.question_id,
        subject_id: d.subject_id,
        subject_title_id: d.subject_title_id,
        standard: d.standard,
        board_id: d.board_id,
        chapter_id: d.chapter_id,
        question: d.question,
        answer: d.answer,
        type: d.type,
        options,
        marks: d.marks,
        image_url: d.image_url ? `${baseUrl}/${d.image_url}` : null,
      };
    });

    return res.status(200).json({
      success: true,
      count: formatted.length,
      questions: formatted,
    });
  } catch (err) {
    console.error('[quiz suggestMcq]', err);
    return res.status(500).json({ success: false, message: 'Error suggesting MCQs', error: err.message });
  }
};

/**
 * GET /api/quiz/:paperId
 * Returns paper with resolved questions (in order of body). Teacher: own only; Admin: any.
 */
exports.getQuizWithQuestions = async (req, res) => {
  try {
    const paperId = parseInt(req.params.paperId, 10);
    if (isNaN(paperId)) {
      return res.status(400).json({ success: false, message: 'Invalid paper ID' });
    }

    const paper = await Paper.findByPk(paperId);
    if (!paper) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const paperData = paper.toJSON();
    if (String((paperData.type || '').toLowerCase()) !== 'quiz') {
      return res.status(400).json({ success: false, message: 'Not a quiz paper' });
    }

    if (!canAccessQuiz(paper, req.user)) {
      return res.status(403).json({ success: false, message: 'Not allowed to access this quiz' });
    }

    const user = await User.findByPk(paper.user_id, { attributes: ['id', 'school_name', 'address', 'logo', 'logo_url'] });
    const userData = user ? user.toJSON() : {};

    const ids = getQuestionIdsFromPaper(paper);
    let questions = [];
    if (ids.length > 0) {
      const byId = await Question.findAll({
        where: { question_id: { [Op.in]: ids } },
        attributes: [
          'question_id',
          'question',
          'answer',
          'type',
          'options',
          'marks',
          'image_url',
        ],
      });
      const map = {};
      byId.forEach((q) => {
        map[q.question_id] = q.toJSON();
      });
      questions = ids.map((id) => map[id]).filter(Boolean);
      questions.forEach((q) => {
        if (typeof q.options === 'string') {
          try {
            q.options = JSON.parse(q.options);
          } catch {
            q.options = null;
          }
        }
      });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    questions = questions.map((q) => ({
      ...q,
      image_url: q.image_url ? `${baseUrl}/${q.image_url}` : null,
    }));

    return res.status(200).json({
      success: true,
      paper: {
        id: paperData.id,
        user_id: paperData.user_id,
        type: paperData.type,
        paper_title: paperData.paper_title,
        standard: paperData.standard,
        subject: paperData.subject,
        board: paperData.board,
        date: paperData.date,
        school_name: userData.school_name || paperData.school_name,
        address: userData.address || paperData.address,
        logo: userData.logo || userData.logo_url || paperData.logo,
      },
      questions,
    });
  } catch (err) {
    console.error('[quiz getQuizWithQuestions]', err);
    return res.status(500).json({ success: false, message: 'Error fetching quiz', error: err.message });
  }
};

/** Helper: load paper + questions and check access; returns { paper, questions } or sends error response. */
async function loadQuizForPdf(req, res) {
  const paperId = parseInt(req.params.paperId, 10);
  if (isNaN(paperId)) {
    res.status(400).json({ success: false, message: 'Invalid paper ID' });
    return null;
  }

  const paper = await Paper.findByPk(paperId);
  if (!paper) {
    res.status(404).json({ success: false, message: 'Quiz not found' });
    return null;
  }

  if (String((paper.type || '').toLowerCase()) !== 'quiz') {
    res.status(400).json({ success: false, message: 'Not a quiz paper' });
    return null;
  }

  if (!canAccessQuiz(paper, req.user)) {
    res.status(403).json({ success: false, message: 'Not allowed to access this quiz' });
    return null;
  }

  const user = await User.findByPk(paper.user_id, { attributes: ['school_name', 'address'] });
  const userData = user ? user.toJSON() : {};

  const ids = getQuestionIdsFromPaper(paper);
  let questions = [];
  if (ids.length > 0) {
    const byId = await Question.findAll({
      where: { question_id: { [Op.in]: ids } },
      order: [['question_id', 'ASC']],
      attributes: ['question_id', 'question', 'answer', 'options', 'marks'],
    });
    const map = {};
    byId.forEach((q) => {
      map[q.question_id] = q.toJSON();
    });
    questions = ids.map((id) => map[id]).filter(Boolean);
  }

  const paperData = paper.toJSON();
  return {
    paper: {
      ...paperData,
      school_name: userData.school_name || paperData.school_name,
      address: userData.address || paperData.address,
    },
    questions,
  };
}

/**
 * GET /api/quiz/:paperId/paper-pdf — student quiz PDF (no answers).
 */
exports.getPaperPdf = async (req, res) => {
  try {
    const data = await loadQuizForPdf(req, res);
    if (!data) return;

    const buffer = await quizPdfService.generateQuizPaperPdf(data.paper, data.questions);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="quiz-${req.params.paperId}-paper.pdf"`);
    res.send(buffer);
  } catch (err) {
    console.error('[quiz getPaperPdf]', err);
    res.status(500).json({ success: false, message: 'Error generating PDF', error: err.message });
  }
};

/**
 * GET /api/quiz/:paperId/answer-key — answer key PDF.
 */
exports.getAnswerKeyPdf = async (req, res) => {
  try {
    const data = await loadQuizForPdf(req, res);
    if (!data) return;

    const buffer = await quizPdfService.generateAnswerKeyPdf(data.paper, data.questions);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="quiz-${req.params.paperId}-answer-key.pdf"`);
    res.send(buffer);
  } catch (err) {
    console.error('[quiz getAnswerKeyPdf]', err);
    res.status(500).json({ success: false, message: 'Error generating answer key PDF', error: err.message });
  }
};

/**
 * GET /api/quiz/:paperId/omr-sheet — OMR bubble sheet PDF.
 */
exports.getOmrSheetPdf = async (req, res) => {
  try {
    const data = await loadQuizForPdf(req, res);
    if (!data) return;

    const buffer = await quizPdfService.generateOmrSheetPdf(data.paper, data.questions);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="quiz-${req.params.paperId}-omr-sheet.pdf"`);
    res.send(buffer);
  } catch (err) {
    console.error('[quiz getOmrSheetPdf]', err);
    res.status(500).json({ success: false, message: 'Error generating OMR sheet', error: err.message });
  }
};
