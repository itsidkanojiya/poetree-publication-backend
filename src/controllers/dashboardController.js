const { Op, fn, col } = require('sequelize');
const Paper = require('../models/Paper');
const WorkSheet = require('../models/Worksheet');
const AnswerSheet = require('../models/AnswerSheet');
const UserSubjectTitle = require('../models/UserSubjectTitle');
const Question = require('../models/Question');

const QUESTION_TYPE_KEYS = ['mcq', 'short', 'long', 'blank', 'onetwo', 'true_false', 'truefalse', 'passage', 'match'];

/**
 * GET /api/dashboard
 * Single dashboard endpoint: papers count, worksheets count, answer sheets count,
 * has_approved_subjects, question_counts_by_type. Auth required (Bearer token).
 * Optional query: subject_id, subject_title_id, standard, board_id.
 * When any of these params are present: filter worksheets_count, answer_sheets_count,
 * and question_counts_by_type by that context. When not provided: return total counts.
 */
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user?.id ?? req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { subject_id, subject_title_id, standard, board_id } = req.query;

    const contextWhere = {};
    if (subject_id) {
      const sid = parseInt(subject_id, 10);
      if (!isNaN(sid)) contextWhere.subject_id = sid;
    }
    if (subject_title_id) {
      const stid = parseInt(subject_title_id, 10);
      if (!isNaN(stid)) contextWhere.subject_title_id = stid;
    }
    if (standard !== undefined && standard !== '') {
      const std = parseInt(standard, 10);
      if (!isNaN(std)) contextWhere.standard = std;
    }
    if (board_id) {
      const bid = parseInt(board_id, 10);
      if (!isNaN(bid)) contextWhere.board_id = bid;
    }

    const [
      papers_count,
      worksheets_count,
      answer_sheets_count,
      approvedCount,
      questionRows,
    ] = await Promise.all([
      Paper.count({
        where: {
          user_id: userId,
          [Op.or]: [{ is_template: false }, { is_template: null }],
        },
      }),
      WorkSheet.count({ where: contextWhere }),
      AnswerSheet.count({ where: contextWhere }),
      UserSubjectTitle.count({
        where: { user_id: userId, status: 'approved' },
      }),
      Question.findAll({
        where: Object.keys(contextWhere).length > 0 ? contextWhere : undefined,
        attributes: ['type', [fn('COUNT', col('question_id')), 'count']],
        group: ['type'],
        raw: true,
      }),
    ]);

    const question_counts_by_type = {};
    QUESTION_TYPE_KEYS.forEach(k => { question_counts_by_type[k] = 0; });
    questionRows.forEach(row => {
      const type = (row.type || '').toLowerCase();
      const countVal = row.count ?? row['COUNT(`question_id`)'];
      const count = parseInt(countVal, 10) || 0;
      if (type === 'truefalse') {
        question_counts_by_type.truefalse = count;
        question_counts_by_type.true_false = count;
      } else if (QUESTION_TYPE_KEYS.includes(type)) {
        question_counts_by_type[type] = count;
      }
    });

    return res.status(200).json({
      papers_count: Number(papers_count),
      worksheets_count: Number(worksheets_count),
      answer_sheets_count: Number(answer_sheets_count),
      has_approved_subjects: approvedCount > 0,
      question_counts_by_type,
    });
  } catch (err) {
    console.error('[getDashboard]', err);
    return res.status(500).json({ success: false, message: 'Dashboard error', error: err.message });
  }
};
