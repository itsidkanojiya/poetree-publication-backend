const { Op } = require('sequelize');
const crypto = require('crypto');
const Paper = require('../models/Paper');
const Question = require('../models/Question');
const User = require('../models/User');

// --- In-memory session store (keyed by sessionId; optional reverse map by sessionCode) ---
const sessionsById = new Map();
const sessionsByCode = new Map();

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateSessionCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARS[crypto.randomInt(0, CHARS.length)];
  }
  return code;
}

function generateSessionId() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

/** Check if current user can access this paper (quiz). Teacher: own only; Admin: any. */
function canAccessQuiz(paper, user) {
  if (!user) return false;
  const userId = user.id ?? user.user_id;
  if (user.user_type === 'admin') return true;
  return Number(paper.user_id) === Number(userId);
}

/** Parse paper.body (JSON array of question IDs) and return array of IDs in order. */
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

/** Load quiz paper and questions for a given paperId. Returns { paper, questions } or null and sends error response. */
async function loadQuizPaperAndQuestions(paperId, req, res) {
  const id = parseInt(paperId, 10);
  if (isNaN(id)) {
    res.status(400).json({ success: false, message: 'Invalid paper ID' });
    return null;
  }

  const paper = await Paper.findByPk(id);
  if (!paper) {
    res.status(404).json({ success: false, message: 'Quiz not found' });
    return null;
  }

  const paperData = paper.toJSON();
  if (String((paperData.type || '').toLowerCase()) !== 'quiz') {
    res.status(400).json({ success: false, message: 'Not a quiz paper' });
    return null;
  }

  if (!canAccessQuiz(paper, req.user)) {
    res.status(403).json({ success: false, message: 'Not allowed to access this quiz' });
    return null;
  }

  const ids = getQuestionIdsFromPaper(paper);
  let questions = [];
  if (ids.length > 0) {
    const byId = await Question.findAll({
      where: { question_id: { [Op.in]: ids } },
      attributes: ['question_id', 'question', 'answer', 'type', 'options', 'marks', 'image_url'],
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

  return {
    paper: paperData,
    questions,
  };
}

/** Build public session state object (same shape for GET session and GET public). */
function toSessionState(session, baseUrl = '') {
  const questions = (session.questions || []).map((q) => ({
    ...q,
    image_url: q.image_url && baseUrl ? `${baseUrl}/${q.image_url}` : q.image_url || null,
  }));
  return {
    status: session.status,
    sessionId: session.id,
    sessionCode: session.session_code || null,
    paper_title: session.paper_title || null,
    currentQuestionIndex: session.current_question_index,
    questions,
    revealedQuestionIndices: Array.isArray(session.revealed_question_indices)
      ? [...session.revealed_question_indices]
      : [],
  };
}

/** Ensure session exists and current user is owner (for control endpoints). Returns session or sends 403/404. */
function getSessionForControl(sessionId, req, res) {
  const session = sessionsById.get(sessionId);
  if (!session) {
    res.status(404).json({ success: false, message: 'Session not found' });
    return null;
  }
  const userId = req.user?.id ?? req.user?.user_id;
  if (req.user?.user_type !== 'admin' && Number(session.user_id) !== Number(userId)) {
    res.status(403).json({ success: false, message: 'Not allowed to control this session' });
    return null;
  }
  return session;
}

// --- Handlers ---

/**
 * POST /api/live/start
 * Body: { paperId }
 * Returns: 201 { sessionId, sessionCode? }
 */
exports.startSession = async (req, res) => {
  try {
    const { paperId } = req.body || {};
    const data = await loadQuizPaperAndQuestions(paperId, req, res);
    if (!data) return;

    const { paper, questions } = data;
    let sessionCode = generateSessionCode(6);
    while (sessionsByCode.has(sessionCode)) {
      sessionCode = generateSessionCode(6);
    }
    const id = generateSessionId();
    const session = {
      id,
      session_code: sessionCode,
      paper_id: paper.id,
      user_id: paper.user_id,
      status: 'active',
      current_question_index: 0,
      revealed_question_indices: [],
      paper_title: paper.paper_title || null,
      questions,
    };
    sessionsById.set(id, session);
    sessionsByCode.set(sessionCode, session);

    return res.status(201).json({
      sessionId: id,
      sessionCode,
    });
  } catch (err) {
    console.error('[live startSession]', err);
    return res.status(500).json({ success: false, message: 'Error starting live session', error: err.message });
  }
};

/**
 * GET /api/live/session/:sessionId
 * Returns full session state (auth required, owner only).
 */
exports.getSession = async (req, res) => {
  try {
    const session = getSessionForControl(req.params.sessionId, req, res);
    if (!session) return;

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return res.status(200).json(toSessionState(session, baseUrl));
  } catch (err) {
    console.error('[live getSession]', err);
    return res.status(500).json({ success: false, message: 'Error fetching session', error: err.message });
  }
};

/**
 * PATCH /api/live/session/:sessionId/current
 * Body: { questionIndex }
 */
exports.setCurrent = async (req, res) => {
  try {
    const session = getSessionForControl(req.params.sessionId, req, res);
    if (!session) return;

    const { questionIndex } = req.body || {};
    const idx = parseInt(questionIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= (session.questions || []).length) {
      return res.status(400).json({ success: false, message: 'Invalid or out-of-range questionIndex' });
    }
    session.current_question_index = idx;
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[live setCurrent]', err);
    return res.status(500).json({ success: false, message: 'Error updating current question', error: err.message });
  }
};

/**
 * POST /api/live/session/:sessionId/reveal
 * Body: { questionIndex? } — optional; default current question.
 */
exports.reveal = async (req, res) => {
  try {
    const session = getSessionForControl(req.params.sessionId, req, res);
    if (!session) return;

    let idx = req.body?.questionIndex;
    if (idx === undefined || idx === null) {
      idx = session.current_question_index;
    } else {
      idx = parseInt(idx, 10);
      if (isNaN(idx) || idx < 0 || idx >= (session.questions || []).length) {
        return res.status(400).json({ success: false, message: 'Invalid or out-of-range questionIndex' });
      }
    }
    if (!session.revealed_question_indices.includes(idx)) {
      session.revealed_question_indices.push(idx);
      session.revealed_question_indices.sort((a, b) => a - b);
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[live reveal]', err);
    return res.status(500).json({ success: false, message: 'Error revealing answer', error: err.message });
  }
};

/**
 * POST /api/live/session/:sessionId/end
 */
exports.endSession = async (req, res) => {
  try {
    const session = getSessionForControl(req.params.sessionId, req, res);
    if (!session) return;

    session.status = 'ended';
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[live endSession]', err);
    return res.status(500).json({ success: false, message: 'Error ending session', error: err.message });
  }
};

/**
 * GET /api/live/public/:sessionId — public session state by session ID (no auth).
 * GET /api/live/public/code/:sessionCode — public session state by session code (no auth).
 */
exports.getPublicSession = async (req, res) => {
  try {
    let session = null;
    if (req.params.sessionId) {
      session = sessionsById.get(req.params.sessionId);
    } else if (req.params.sessionCode) {
      session = sessionsByCode.get(req.params.sessionCode);
    }
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return res.status(200).json(toSessionState(session, baseUrl));
  } catch (err) {
    console.error('[live getPublicSession]', err);
    return res.status(500).json({ success: false, message: 'Error fetching session', error: err.message });
  }
};
