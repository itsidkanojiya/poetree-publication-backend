const ReadymadePaper = require("../models/ReadymadePaper");
const Chapter = require("../models/Chapter");
const UserSubjectTitle = require("../models/UserSubjectTitle");
const path = require("path");
const fs = require("fs");
const { Op } = require("sequelize");
const { Subject, SubjectTitle, Boards } = require("../models/Subjects");
const Standard = require("../models/Standard");

async function getStandardNamesMap(standardIds) {
  if (!standardIds || standardIds.length === 0) return new Map();
  const ids = [...new Set(standardIds.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id)))];
  if (ids.length === 0) return new Map();
  const rows = await Standard.findAll({
    where: { standard_id: { [Op.in]: ids } },
    attributes: ["standard_id", "name"],
  });
  const map = new Map();
  rows.forEach((r) => map.set(r.standard_id, r.name));
  return map;
}

// Associations
ReadymadePaper.belongsTo(Subject, { foreignKey: "subject_id", as: "subject" });
ReadymadePaper.belongsTo(SubjectTitle, {
  foreignKey: "subject_title_id",
  as: "subject_title",
});
ReadymadePaper.belongsTo(Boards, { foreignKey: "board_id", as: "board" });
ReadymadePaper.belongsTo(Chapter, { foreignKey: "chapter_id", as: "chapter" });
Subject.hasMany(ReadymadePaper, { foreignKey: "subject_id" });
SubjectTitle.hasMany(ReadymadePaper, { foreignKey: "subject_title_id" });

// Add Readymade Paper (PDF and/or Word; at least one required)
exports.addReadymadePaper = async (req, res) => {
  try {
    const {
      subject_id,
      board_id,
      subject_title_id,
      standard: standardLevel,
      total_marks,
      user_id,
      chapter_id,
    } = req.body;

    const userId = user_id || req.user?.id || req.user?.user_id;

    if (!subject_id || !board_id || !subject_title_id || !standardLevel) {
      return res.status(400).json({
        error: "Missing required fields: subject_id, board_id, subject_title_id, standard",
      });
    }

    const pdfUrl =
      req.files && req.files.paper_pdf
        ? `uploads/readymadepaper/pdf/${req.files.paper_pdf[0].filename}`
        : null;
    const wordUrl =
      req.files && req.files.paper_word
        ? `uploads/readymadepaper/word/${req.files.paper_word[0].filename}`
        : null;

    // At least one file must be provided
    if (!pdfUrl && !wordUrl) {
      return res
        .status(400)
        .json({ error: "At least one file is required: paper_pdf (PDF) or paper_word (Word)" });
    }

    let chapterIdVal = null;
    if (chapter_id != null && chapter_id !== "") {
      const cid = parseInt(chapter_id, 10);
      if (!isNaN(cid)) {
        const chapter = await Chapter.findByPk(cid);
        if (chapter && chapter.subject_title_id === parseInt(subject_title_id, 10)) {
          chapterIdVal = cid;
        }
      }
    }

    let totalMarksVal = null;
    if (total_marks != null && total_marks !== "") {
      const tm = parseInt(total_marks, 10);
      if (!isNaN(tm)) totalMarksVal = tm;
    }

    const paper = await ReadymadePaper.create({
      subject_id,
      paper_pdf_url: pdfUrl,
      paper_word_url: wordUrl,
      subject_title_id,
      board_id,
      standard: standardLevel,
      total_marks: totalMarksVal,
      chapter_id: chapterIdVal,
    });

    // Auto-approve the subject title for the uploading user (same as worksheet/answersheet)
    if (userId) {
      try {
        const existing = await UserSubjectTitle.findOne({
          where: { user_id: userId, subject_title_id },
        });
        if (!existing) {
          await UserSubjectTitle.create({
            user_id: userId,
            subject_id,
            subject_title_id,
            status: "approved",
            approved_by: req.user?.id || req.user?.user_id || null,
            approved_at: new Date(),
          });
        }
      } catch (userSubjectTitleError) {
        console.error("Error creating UserSubjectTitle:", userSubjectTitleError);
      }
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const stdName =
      paper.standard != null
        ? (await getStandardNamesMap([paper.standard])).get(parseInt(paper.standard, 10))
        : null;
    const formatted = {
      ...paper.toJSON(),
      paper_pdf_url: paper.paper_pdf_url ? `${baseUrl}/${paper.paper_pdf_url}` : null,
      paper_word_url: paper.paper_word_url ? `${baseUrl}/${paper.paper_word_url}` : null,
      standard_name: stdName ?? null,
      chapter_id: paper.chapter_id ?? null,
    };

    return res.status(200).json({ success: true, readymade_paper: formatted });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

// Get All Readymade Papers
exports.getAllReadymadePapers = async (req, res) => {
  try {
    const { chapter_id } = req.query;
    const where = {};
    if (chapter_id) {
      const cid = parseInt(chapter_id, 10);
      if (!isNaN(cid)) where.chapter_id = cid;
    }
    const papers = await ReadymadePaper.findAll({
      where: Object.keys(where).length ? where : undefined,
      attributes: [
        "readymade_paper_id",
        "subject_id",
        "subject_title_id",
        "standard",
        "board_id",
        "total_marks",
        "paper_pdf_url",
        "paper_word_url",
        "chapter_id",
        "createdAt",
        "updatedAt",
      ],
      include: [
        { model: Subject, as: "subject", attributes: ["subject_name"] },
        { model: SubjectTitle, as: "subject_title", attributes: ["title_name"] },
        { model: Boards, as: "board", attributes: ["board_name"] },
        { model: Chapter, as: "chapter", attributes: ["chapter_id", "chapter_name"], required: false },
      ],
    });
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const allStdIds = papers.map((s) => s.standard).filter(Boolean);
    const stdMap = await getStandardNamesMap(allStdIds);
    const formatted = papers.map((p) => ({
      ...p.toJSON(),
      subject: p.subject ? p.subject.subject_name : null,
      subject_title: p.subject_title ? p.subject_title.title_name : null,
      board: p.board ? p.board.board_name : null,
      standard_name: p.standard != null ? stdMap.get(parseInt(p.standard, 10)) ?? null : null,
      chapter_id: p.chapter_id ?? null,
      chapter: p.chapter ? { chapter_id: p.chapter.chapter_id, chapter_name: p.chapter.chapter_name } : null,
      paper_pdf_url: p.paper_pdf_url ? `${baseUrl}/${p.paper_pdf_url}` : null,
      paper_word_url: p.paper_word_url ? `${baseUrl}/${p.paper_word_url}` : null,
    }));

    res.status(200).json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Delete Readymade Paper (removes both physical files)
exports.deleteReadymadePaper = async (req, res) => {
  try {
    const { id } = req.params;
    const paper = await ReadymadePaper.findByPk(id);
    if (!paper) {
      return res.status(404).json({ message: "Readymade paper not found" });
    }

    for (const url of [paper.paper_pdf_url, paper.paper_word_url]) {
      if (!url) continue;
      try {
        const filePath = path.join(__dirname, "..", "..", url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`✅ Deleted file: ${filePath}`);
        } else {
          console.log(`❌ File not found: ${filePath}`);
        }
      } catch (fileErr) {
        console.error(`Failed to delete file for readymade paper ${id}:`, fileErr.message);
      }
    }

    await paper.destroy();
    res.status(200).json({ message: "Readymade paper and associated files deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Bulk delete
exports.bulkDeleteReadymadePapers = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids must be a non-empty array" });
    }

    const papers = await ReadymadePaper.findAll({
      where: { readymade_paper_id: { [Op.in]: ids } },
    });

    for (const paper of papers) {
      for (const url of [paper.paper_pdf_url, paper.paper_word_url]) {
        if (!url) continue;
        try {
          const filePath = path.join(__dirname, "..", "..", url);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`✅ Deleted file: ${filePath}`);
          } else {
            console.log(`❌ File not found: ${filePath}`);
          }
        } catch (fileErr) {
          console.error(
            `Failed to delete file for readymade paper ${paper.readymade_paper_id}:`,
            fileErr.message
          );
        }
      }
    }

    const deletedCount = await ReadymadePaper.destroy({
      where: { readymade_paper_id: { [Op.in]: ids } },
    });

    res.status(200).json({ deletedCount, requested: ids.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
