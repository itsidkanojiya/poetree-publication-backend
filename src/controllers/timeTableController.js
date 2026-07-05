const TimeTable = require("../models/TimeTable");
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
TimeTable.belongsTo(Subject, { foreignKey: "subject_id", as: "subject" });
TimeTable.belongsTo(Boards, { foreignKey: "board_id", as: "board" });
Subject.hasMany(TimeTable, { foreignKey: "subject_id" });

function buildStandardsArray(ids, stdMap) {
  return ids.map((id) => ({ standard_id: id, name: stdMap.get(parseInt(id, 10)) ?? null }));
}

// Add Time Table
exports.addTimeTable = async (req, res) => {
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
      req.files && req.files.timetable_pdf
        ? `uploads/timetable/pdf/${req.files.timetable_pdf[0].filename}`
        : null;
    if (!pdfUrl) {
      return res.status(400).json({ error: "Missing required file: timetable_pdf (PDF)" });
    }

    const timetable = await TimeTable.create({
      title: title.trim(),
      subject_id,
      board_id,
      standard: standardIds,
      timetable_pdf_url: pdfUrl,
    });

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const stdMap = await getStandardNamesMap(standardIds);
    const subject = await Subject.findByPk(subject_id, { attributes: ["subject_name"] });
    const board = await Boards.findByPk(board_id, { attributes: ["board_name"] });

    return res.status(200).json({
      success: true,
      timetable: {
        ...timetable.toJSON(),
        subject: subject ? subject.subject_name : null,
        board: board ? board.board_name : null,
        standard: standardIds,
        standards: buildStandardsArray(standardIds, stdMap),
        timetable_pdf_url: `${baseUrl}/${pdfUrl}`,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

// Get All Time Tables
exports.getAllTimeTables = async (req, res) => {
  try {
    const timetables = await TimeTable.findAll({
      include: [
        { model: Subject, as: "subject", attributes: ["subject_name"] },
        { model: Boards, as: "board", attributes: ["board_name"] },
      ],
      order: [["timetable_id", "DESC"]],
    });

    const allStdIds = [];
    timetables.forEach((t) => parseStandardIds(t.standard).forEach((id) => allStdIds.push(id)));
    const stdMap = await getStandardNamesMap(allStdIds);
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const formatted = timetables.map((t) => {
      const ids = parseStandardIds(t.standard);
      return {
        ...t.toJSON(),
        subject: t.subject ? t.subject.subject_name : null,
        board: t.board ? t.board.board_name : null,
        standard: ids,
        standards: buildStandardsArray(ids, stdMap),
        timetable_pdf_url: t.timetable_pdf_url ? `${baseUrl}/${t.timetable_pdf_url}` : null,
      };
    });

    res.status(200).json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Delete Time Table
exports.deleteTimeTable = async (req, res) => {
  try {
    const { id } = req.params;
    const timetable = await TimeTable.findByPk(id);
    if (!timetable) return res.status(404).json({ message: "Time table not found" });

    if (timetable.timetable_pdf_url) {
      try {
        const filePath = path.join(__dirname, "..", "..", timetable.timetable_pdf_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`✅ Deleted file: ${filePath}`);
        }
      } catch (fileErr) {
        console.error(`Failed to delete timetable file ${id}:`, fileErr.message);
      }
    }

    await timetable.destroy();
    res.status(200).json({ message: "Time table and file deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Bulk delete
exports.bulkDeleteTimeTables = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids must be a non-empty array" });
    }
    const timetables = await TimeTable.findAll({ where: { timetable_id: { [Op.in]: ids } } });
    for (const timetable of timetables) {
      if (!timetable.timetable_pdf_url) continue;
      try {
        const filePath = path.join(__dirname, "..", "..", timetable.timetable_pdf_url);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (fileErr) {
        console.error(`Failed to delete timetable file ${timetable.timetable_id}:`, fileErr.message);
      }
    }
    const deletedCount = await TimeTable.destroy({ where: { timetable_id: { [Op.in]: ids } } });
    res.status(200).json({ deletedCount, requested: ids.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
