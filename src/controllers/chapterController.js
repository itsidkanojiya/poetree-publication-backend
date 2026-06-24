const Chapter = require('../models/Chapter');
const { SubjectTitle } = require('../models/Subjects');
const Question = require('../models/Question');
const Paper = require('../models/Paper');
const Worksheet = require('../models/Worksheet');
const AnswerSheet = require('../models/AnswerSheet');
const Animation = require('../models/Animation');
const sequelize = require('../config/db');

/**
 * GET /api/chapters?subject_title_id=:id - List chapters for a subject title.
 *
 * Chapters are linked only to the subject title, so the list is filtered solely
 * by subject_title_id. Results are ordered by chapter_number (sequence), nulls
 * last, then name.
 */
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
      attributes: ['chapter_id', 'chapter_name', 'chapter_number', 'subject_title_id'],
      order: [
        [sequelize.literal('chapter_number IS NULL'), 'ASC'], // numbered chapters first
        ['chapter_number', 'ASC'],
        ['chapter_name', 'ASC'],
      ],
    });
    res.status(200).json({ success: true, chapters });
  } catch (err) {
    console.error('[getChaptersBySubjectTitle]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/** POST /api/chapters - Create a chapter (body: chapter_name, subject_title_id, chapter_number?) */
exports.createChapter = async (req, res) => {
  try {
    const { chapter_name, subject_title_id, chapter_number } = req.body;
    if (!chapter_name || typeof chapter_name !== 'string' || !chapter_name.trim()) {
      return res.status(400).json({ success: false, error: 'chapter_name is required' });
    }
    const stId = parseInt(subject_title_id, 10);
    if (!subject_title_id || isNaN(stId)) {
      return res.status(400).json({ success: false, error: 'subject_title_id is required and must be a number' });
    }

    // chapter_number is optional; when provided it must be a positive integer
    let chapterNumber = null;
    if (chapter_number != null && chapter_number !== '') {
      chapterNumber = parseInt(chapter_number, 10);
      if (isNaN(chapterNumber) || chapterNumber < 0) {
        return res.status(400).json({ success: false, error: 'chapter_number must be a non-negative number' });
      }
    }

    const subjectTitle = await SubjectTitle.findByPk(stId);
    if (!subjectTitle) {
      return res.status(404).json({ success: false, error: 'Subject title not found' });
    }
    const chapter = await Chapter.create({
      chapter_name: chapter_name.trim().slice(0, 200),
      chapter_number: chapterNumber,
      subject_title_id: stId,
    });
    res.status(201).json({
      success: true,
      message: 'Chapter created successfully',
      chapter: {
        chapter_id: chapter.chapter_id,
        chapter_name: chapter.chapter_name,
        chapter_number: chapter.chapter_number,
        subject_title_id: chapter.subject_title_id,
      },
    });
  } catch (err) {
    console.error('[createChapter]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/** PUT /api/chapters/:chapterId - Update a chapter's name and/or number (admin only) */
exports.updateChapter = async (req, res) => {
  try {
    const chapterId = parseInt(req.params.chapterId, 10);
    if (isNaN(chapterId)) {
      return res.status(400).json({ success: false, error: 'Invalid chapter id' });
    }

    const chapter = await Chapter.findByPk(chapterId);
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapter not found' });
    }

    const { chapter_name, chapter_number } = req.body;
    const updates = {};

    if (chapter_name != null) {
      if (typeof chapter_name !== 'string' || !chapter_name.trim()) {
        return res.status(400).json({ success: false, error: 'chapter_name must be a non-empty string' });
      }
      updates.chapter_name = chapter_name.trim().slice(0, 200);
    }

    if (chapter_number !== undefined) {
      if (chapter_number === null || chapter_number === '') {
        updates.chapter_number = null;
      } else {
        const num = parseInt(chapter_number, 10);
        if (isNaN(num) || num < 0) {
          return res.status(400).json({ success: false, error: 'chapter_number must be a non-negative number' });
        }
        updates.chapter_number = num;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'Nothing to update' });
    }

    await chapter.update(updates);
    res.status(200).json({
      success: true,
      message: 'Chapter updated successfully',
      chapter: {
        chapter_id: chapter.chapter_id,
        chapter_name: chapter.chapter_name,
        chapter_number: chapter.chapter_number,
        subject_title_id: chapter.subject_title_id,
      },
    });
  } catch (err) {
    console.error('[updateChapter]', err);
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

    // Papers can reference chapter via chapter_id (single) or chapter_ids (JSON array)
    const papersWhere = sequelize.literal(
      `(chapter_id = ${chapterId} OR (chapter_ids IS NOT NULL AND chapter_ids != '' AND JSON_CONTAINS(chapter_ids, CAST(${chapterId} AS JSON), '$')))`
    );
    const [questionsCount, papersCount, worksheetsCount, answersheetsCount, animationsCount] = await Promise.all([
      Question.count({ where: { chapter_id: chapterId } }),
      Paper.count({ where: papersWhere }),
      Worksheet.count({ where: { chapter_id: chapterId } }),
      AnswerSheet.count({ where: { chapter_id: chapterId } }),
      Animation.count({ where: { chapter_id: chapterId } }),
    ]);

    const inUse = questionsCount > 0 || papersCount > 0 || worksheetsCount > 0 || answersheetsCount > 0 || animationsCount > 0;
    if (inUse) {
      return res.status(409).json({
        success: false,
        error: 'Chapter is in use and cannot be deleted. Remove or reassign it from questions, papers, worksheets, answer sheets, or animations first.',
        in_use: {
          questions: questionsCount,
          papers: papersCount,
          worksheets: worksheetsCount,
          answersheets: answersheetsCount,
          animations: animationsCount,
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
