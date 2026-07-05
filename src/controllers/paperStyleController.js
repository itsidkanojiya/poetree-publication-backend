const PaperStyle = require("../models/PaperStyle");
const path = require("path");
const fs = require("fs");
const { Op } = require("sequelize");
const { Subject, Boards } = require("../models/Subjects");
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

function parseStandardIds(standard) {
  if (standard == null) return [];
  if (Array.isArray(standard)) {
    return standard.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
  }
  if (typeof standard === "string") {
    try {
      const parsed = JSON.parse(standard);
      if (Array.isArray(parsed)) return parsed.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
    } catch {
      return standard
        .split(",")
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id));
    }
  }
  const n = parseInt(standard, 10);
  return isNaN(n) ? [] : [n];
}

// Associations
PaperStyle.belongsTo(Subject, { foreignKey: "subject_id", as: "subject" });
PaperStyle.belongsTo(Boards, { foreignKey: "board_id", as: "board" });
Subject.hasMany(PaperStyle, { foreignKey: "subject_id" });

function buildStandardsArray(ids, stdMap) {
  return ids.map((id) => ({ standard_id: id, name: stdMap.get(parseInt(id, 10)) ?? null }));
}

// Add Paper Style
exports.addPaperStyle = async (req, res) => {
  try {
    const { title, subject_id, board_id, standard } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "title is required" });
    }
    if (!subject_id || !board_id) {
      return res.status(400).json({ error: "Missing required fields: subject_id, board_id" });
    }
    const standardIds = parseStandardIds(standard);
    if (standardIds.length === 0) {
      return res.status(400).json({ error: "At least one standard is required" });
    }

    const pdfUrl =
      req.files && req.files.paper_style_pdf
        ? `uploads/paperstyle/pdf/${req.files.paper_style_pdf[0].filename}`
        : null;
    if (!pdfUrl) {
      return res.status(400).json({ error: "Missing required file: paper_style_pdf (PDF)" });
    }

    const paperStyle = await PaperStyle.create({
      title: title.trim(),
      subject_id,
      board_id,
      standard: standardIds,
      paper_style_pdf_url: pdfUrl,
    });

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const stdMap = await getStandardNamesMap(standardIds);
    const subject = await Subject.findByPk(subject_id, { attributes: ["subject_name"] });
    const board = await Boards.findByPk(board_id, { attributes: ["board_name"] });

    return res.status(200).json({
      success: true,
      paper_style: {
        ...paperStyle.toJSON(),
        subject: subject ? subject.subject_name : null,
        board: board ? board.board_name : null,
        standard: standardIds,
        standards: buildStandardsArray(standardIds, stdMap),
        paper_style_pdf_url: `${baseUrl}/${pdfUrl}`,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

// Get All Paper Styles
exports.getAllPaperStyles = async (req, res) => {
  try {
    const items = await PaperStyle.findAll({
      include: [
        { model: Subject, as: "subject", attributes: ["subject_name"] },
        { model: Boards, as: "board", attributes: ["board_name"] },
      ],
      order: [["paper_style_id", "DESC"]],
    });

    const allStdIds = [];
    items.forEach((p) => parseStandardIds(p.standard).forEach((id) => allStdIds.push(id)));
    const stdMap = await getStandardNamesMap(allStdIds);
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const formatted = items.map((p) => {
      const ids = parseStandardIds(p.standard);
      return {
        ...p.toJSON(),
        subject: p.subject ? p.subject.subject_name : null,
        board: p.board ? p.board.board_name : null,
        standard: ids,
        standards: buildStandardsArray(ids, stdMap),
        paper_style_pdf_url: p.paper_style_pdf_url ? `${baseUrl}/${p.paper_style_pdf_url}` : null,
      };
    });

    res.status(200).json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Delete Paper Style
exports.deletePaperStyle = async (req, res) => {
  try {
    const { id } = req.params;
    const paperStyle = await PaperStyle.findByPk(id);
    if (!paperStyle) return res.status(404).json({ message: "Paper style not found" });

    if (paperStyle.paper_style_pdf_url) {
      try {
        const filePath = path.join(__dirname, "..", "..", paperStyle.paper_style_pdf_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`✅ Deleted file: ${filePath}`);
        }
      } catch (fileErr) {
        console.error(`Failed to delete paper style file ${id}:`, fileErr.message);
      }
    }

    await paperStyle.destroy();
    res.status(200).json({ message: "Paper style and file deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Bulk delete
exports.bulkDeletePaperStyles = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids must be a non-empty array" });
    }
    const items = await PaperStyle.findAll({ where: { paper_style_id: { [Op.in]: ids } } });
    for (const paperStyle of items) {
      if (!paperStyle.paper_style_pdf_url) continue;
      try {
        const filePath = path.join(__dirname, "..", "..", paperStyle.paper_style_pdf_url);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (fileErr) {
        console.error(`Failed to delete paper style file ${paperStyle.paper_style_id}:`, fileErr.message);
      }
    }
    const deletedCount = await PaperStyle.destroy({ where: { paper_style_id: { [Op.in]: ids } } });
    res.status(200).json({ deletedCount, requested: ids.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
