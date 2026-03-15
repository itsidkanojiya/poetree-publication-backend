const Animation = require('../models/Animation');
const Chapter = require('../models/Chapter');

/**
 * Extract YouTube video ID from various URL formats.
 */
function extractYoutubeVideoId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m) return m[1];
  }
  return null;
}

function toPublic(record) {
  const row = record.toJSON ? record.toJSON() : record;
  const videoId = row.video_id || extractYoutubeVideoId(row.youtube_url);
  const out = {
    animation_id: row.animation_id,
    title: row.title,
    youtube_url: row.youtube_url,
    video_id: videoId,
    embed_url: videoId ? `https://www.youtube.com/embed/${videoId}` : null,
    subject_id: row.subject_id,
    subject_title_id: row.subject_title_id,
    board_id: row.board_id,
    standard_id: row.standard_id,
    chapter_id: row.chapter_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  if (row.subject) out.subject = { subject_id: row.subject.subject_id, subject_name: row.subject.subject_name };
  if (row.subject_title) out.subject_title = { subject_title_id: row.subject_title.subject_title_id, title_name: row.subject_title.title_name };
  if (row.board) out.board = { board_id: row.board.board_id, board_name: row.board.board_name };
  if (row.standard) out.standard = { standard_id: row.standard.standard_id, name: row.standard.name };
  if (row.chapter) out.chapter = { chapter_id: row.chapter.chapter_id, chapter_name: row.chapter.chapter_name, subject_title_id: row.chapter.subject_title_id };
  return out;
}

const includeAssociations = [
  { association: 'subject', attributes: ['subject_id', 'subject_name'] },
  { association: 'subject_title', attributes: ['subject_title_id', 'title_name'] },
  { association: 'board', attributes: ['board_id', 'board_name'] },
  { association: 'standard', attributes: ['standard_id', 'name'] },
  { association: 'chapter', attributes: ['chapter_id', 'chapter_name', 'subject_title_id'], required: false },
];

// Get all animations – with subject, subject_title, board, standard, chapter (optional filter by chapter_id)
exports.getAllAnimations = async (req, res) => {
  try {
    const { chapter_id } = req.query;
    const where = {};
    if (chapter_id != null && chapter_id !== '') {
      const cid = parseInt(chapter_id, 10);
      if (isNaN(cid)) {
        return res.status(400).json({ error: 'chapter_id must be a number' });
      }
      where.chapter_id = cid;
    }
    const list = await Animation.findAll({
      where,
      include: includeAssociations,
      order: [['animation_id', 'ASC']],
    });
    res.status(200).json({ success: true, animations: list.map(toPublic) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Get one animation by id
exports.getAnimationById = async (req, res) => {
  try {
    const { id } = req.params;
    const animation = await Animation.findByPk(id, { include: includeAssociations });
    if (!animation) return res.status(404).json({ message: 'Animation not found' });
    res.status(200).json(toPublic(animation));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Add animation (admin) – requires subject_id, subject_title_id, board_id, standard_id; optional chapter_id
exports.addAnimation = async (req, res) => {
  try {
    const { title, youtube_url, subject_id, subject_title_id, board_id, standard_id, chapter_id } = req.body;
    if (!youtube_url || typeof youtube_url !== 'string' || !youtube_url.trim()) {
      return res.status(400).json({ error: 'youtube_url is required' });
    }
    if (subject_id == null || subject_title_id == null || board_id == null || standard_id == null) {
      return res.status(400).json({ error: 'subject_id, subject_title_id, board_id and standard_id are required' });
    }
    const videoId = extractYoutubeVideoId(youtube_url);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL. Use youtube.com/watch?v=... or youtu.be/...' });
    }
    let chapterIdVal = null;
    if (chapter_id != null && chapter_id !== '') {
      const cid = parseInt(chapter_id, 10);
      if (isNaN(cid)) {
        return res.status(400).json({ error: 'chapter_id must be a number' });
      }
      const chapter = await Chapter.findByPk(cid);
      if (!chapter) return res.status(404).json({ error: 'Chapter not found' });
      const stId = parseInt(subject_title_id, 10);
      if (chapter.subject_title_id !== stId) {
        return res.status(400).json({ error: 'Chapter does not belong to the selected subject title' });
      }
      chapterIdVal = cid;
    }
    const animation = await Animation.create({
      title: title ? title.trim() : null,
      youtube_url: youtube_url.trim(),
      video_id: videoId,
      subject_id: parseInt(subject_id, 10),
      subject_title_id: parseInt(subject_title_id, 10),
      board_id: parseInt(board_id, 10),
      standard_id: parseInt(standard_id, 10),
      chapter_id: chapterIdVal,
    });
    const withIncludes = await Animation.findByPk(animation.animation_id, { include: includeAssociations });
    res.status(201).json({ message: 'Animation added successfully', animation: toPublic(withIncludes) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Update animation (admin)
exports.updateAnimation = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, youtube_url, subject_id, subject_title_id, board_id, standard_id, chapter_id } = req.body;
    const animation = await Animation.findByPk(id);
    if (!animation) return res.status(404).json({ message: 'Animation not found' });
    const updates = {};
    if (title !== undefined) updates.title = title ? title.trim() : null;
    if (subject_id !== undefined) updates.subject_id = parseInt(subject_id, 10);
    if (subject_title_id !== undefined) updates.subject_title_id = parseInt(subject_title_id, 10);
    if (board_id !== undefined) updates.board_id = parseInt(board_id, 10);
    if (standard_id !== undefined) updates.standard_id = parseInt(standard_id, 10);
    if (chapter_id !== undefined) {
      if (chapter_id == null || chapter_id === '') {
        updates.chapter_id = null;
      } else {
        const cid = parseInt(chapter_id, 10);
        if (isNaN(cid)) return res.status(400).json({ error: 'chapter_id must be a number' });
        const chapter = await Chapter.findByPk(cid);
        if (!chapter) return res.status(404).json({ error: 'Chapter not found' });
        const stId = animation.subject_title_id;
        if (chapter.subject_title_id !== stId) {
          return res.status(400).json({ error: 'Chapter does not belong to the animation\'s subject title' });
        }
        updates.chapter_id = cid;
      }
    }
    if (youtube_url !== undefined) {
      const url = typeof youtube_url === 'string' ? youtube_url.trim() : '';
      if (!url) return res.status(400).json({ error: 'youtube_url cannot be empty' });
      const videoId = extractYoutubeVideoId(url);
      if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL' });
      updates.youtube_url = url;
      updates.video_id = videoId;
    }
    await animation.update(updates);
    const withIncludes = await Animation.findByPk(animation.animation_id, { include: includeAssociations });
    res.status(200).json({ message: 'Animation updated successfully', animation: toPublic(withIncludes) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Delete animation (admin)
exports.deleteAnimation = async (req, res) => {
  try {
    const { id } = req.params;
    const animation = await Animation.findByPk(id);
    if (!animation) return res.status(404).json({ message: 'Animation not found' });
    await animation.destroy();
    res.status(200).json({ message: 'Animation deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
