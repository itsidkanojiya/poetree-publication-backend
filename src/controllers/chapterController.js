const Chapter = require('../models/Chapter');
const { SubjectTitle } = require('../models/Subjects');
const Question = require('../models/Question');
const Paper = require('../models/Paper');
const Worksheet = require('../models/Worksheet');
const AnswerSheet = require('../models/AnswerSheet');

/** GET /api/chapters?subject_title_id=:id - List chapters for a subject title */
exports.getChaptersBySubjectTitle = async (req, res) => {
  try {
    const { subject_title_id } = req.query;
    if (!subject_title_id) {
      return res.status(400).json({ success: false, error: 'subject_title_id is required' });
    }
    const id = parseInt(subject_title_id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'subject_title_id must be a number' });
    }
    const chapters = await Chapter.findAll({
      where: { subject_title_id: id },
      attributes: ['chapter_id', 'chapter_name', 'subject_title_id'],
      order: [['chapter_name', 'ASC']],
    });
    res.status(200).json({ success: true, chapters });
  } catch (err) {
    console.error('[getChaptersBySubjectTitle]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/** POST /api/chapters - Create a chapter (body: chapter_name, subject_title_id) */
exports.createChapter = async (req, res) => {
  try {
    const { chapter_name, subject_title_id } = req.body;
    if (!chapter_name || typeof chapter_name !== 'string' || !chapter_name.trim()) {
      return res.status(400).json({ success: false, error: 'chapter_name is required' });
    }
    const stId = parseInt(subject_title_id, 10);
    if (!subject_title_id || isNaN(stId)) {
      return res.status(400).json({ success: false, error: 'subject_title_id is required and must be a number' });
    }
    const subjectTitle = await SubjectTitle.findByPk(stId);
    if (!subjectTitle) {
      return res.status(404).json({ success: false, error: 'Subject title not found' });
    }
    const chapter = await Chapter.create({
      chapter_name: chapter_name.trim().slice(0, 200),
      subject_title_id: stId,
    });
    res.status(201).json({
      success: true,
      message: 'Chapter created successfully',
      chapter: { chapter_id: chapter.chapter_id, chapter_name: chapter.chapter_name, subject_title_id: chapter.subject_title_id },
    });
  } catch (err) {
    console.error('[createChapter]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/** DELETE /api/chapters/:chapterId - Delete a chapter (admin only). Returns 409 if chapter is in use. */
exports.deleteChapter = async (req, res) => {
  try {
    const chapterId = parseInt(req.params.chapterId, 10);
    if (isNaN(chapterId)) {
      return res.status(400).json({ success: false, error: 'Invalid chapter id' });
    }

    const chapter = await Chapter.findByPk(chapterId);
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapter not found' });
    }

    const [questionsCount, papersCount, worksheetsCount, answersheetsCount] = await Promise.all([
      Question.count({ where: { chapter_id: chapterId } }),
      Paper.count({ where: { chapter_id: chapterId } }),
      Worksheet.count({ where: { chapter_id: chapterId } }),
      AnswerSheet.count({ where: { chapter_id: chapterId } }),
    ]);

    const inUse = questionsCount > 0 || papersCount > 0 || worksheetsCount > 0 || answersheetsCount > 0;
    if (inUse) {
      return res.status(409).json({
        success: false,
        error: 'Chapter is in use and cannot be deleted. Remove or reassign it from questions, papers, worksheets, or answer sheets first.',
        in_use: {
          questions: questionsCount,
          papers: papersCount,
          worksheets: worksheetsCount,
          answersheets: answersheetsCount,
        },
      });
    }

    await chapter.destroy();
    res.status(204).send();
  } catch (err) {
    console.error('[deleteChapter]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
