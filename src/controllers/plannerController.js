const Planner = require("../models/Planner");
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

// Normalize a standard value (array, JSON string, or scalar) into an int array
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
      // comma separated fallback
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
Planner.belongsTo(Subject, { foreignKey: "subject_id", as: "subject" });
Planner.belongsTo(Boards, { foreignKey: "board_id", as: "board" });
Subject.hasMany(Planner, { foreignKey: "subject_id" });

function buildStandardsArray(ids, stdMap) {
  return ids.map((id) => ({ standard_id: id, name: stdMap.get(parseInt(id, 10)) ?? null }));
}

// Add Planner
exports.addPlanner = async (req, res) => {
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
      req.files && req.files.planner_pdf
        ? `uploads/planner/pdf/${req.files.planner_pdf[0].filename}`
        : null;
    if (!pdfUrl) {
      return res.status(400).json({ error: "Missing required file: planner_pdf (PDF)" });
    }

    const planner = await Planner.create({
      title: title.trim(),
      subject_id,
      board_id,
      standard: standardIds,
      planner_pdf_url: pdfUrl,
    });

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const stdMap = await getStandardNamesMap(standardIds);
    const subject = await Subject.findByPk(subject_id, { attributes: ["subject_name"] });
    const board = await Boards.findByPk(board_id, { attributes: ["board_name"] });

    return res.status(200).json({
      success: true,
      planner: {
        ...planner.toJSON(),
        subject: subject ? subject.subject_name : null,
        board: board ? board.board_name : null,
        standard: standardIds,
        standards: buildStandardsArray(standardIds, stdMap),
        planner_pdf_url: `${baseUrl}/${pdfUrl}`,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

// Get All Planners
exports.getAllPlanners = async (req, res) => {
  try {
    const planners = await Planner.findAll({
      include: [
        { model: Subject, as: "subject", attributes: ["subject_name"] },
        { model: Boards, as: "board", attributes: ["board_name"] },
      ],
      order: [["planner_id", "DESC"]],
    });

    const allStdIds = [];
    planners.forEach((p) => parseStandardIds(p.standard).forEach((id) => allStdIds.push(id)));
    const stdMap = await getStandardNamesMap(allStdIds);
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const formatted = planners.map((p) => {
      const ids = parseStandardIds(p.standard);
      return {
        ...p.toJSON(),
        subject: p.subject ? p.subject.subject_name : null,
        board: p.board ? p.board.board_name : null,
        standard: ids,
        standards: buildStandardsArray(ids, stdMap),
        planner_pdf_url: p.planner_pdf_url ? `${baseUrl}/${p.planner_pdf_url}` : null,
      };
    });

    res.status(200).json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Delete Planner
exports.deletePlanner = async (req, res) => {
  try {
    const { id } = req.params;
    const planner = await Planner.findByPk(id);
    if (!planner) return res.status(404).json({ message: "Planner not found" });

    if (planner.planner_pdf_url) {
      try {
        const filePath = path.join(__dirname, "..", "..", planner.planner_pdf_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`✅ Deleted file: ${filePath}`);
        }
      } catch (fileErr) {
        console.error(`Failed to delete planner file ${id}:`, fileErr.message);
      }
    }

    await planner.destroy();
    res.status(200).json({ message: "Planner and file deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Bulk delete
exports.bulkDeletePlanners = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids must be a non-empty array" });
    }
    const planners = await Planner.findAll({ where: { planner_id: { [Op.in]: ids } } });
    for (const planner of planners) {
      if (!planner.planner_pdf_url) continue;
      try {
        const filePath = path.join(__dirname, "..", "..", planner.planner_pdf_url);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (fileErr) {
        console.error(`Failed to delete planner file ${planner.planner_id}:`, fileErr.message);
      }
    }
    const deletedCount = await Planner.destroy({ where: { planner_id: { [Op.in]: ids } } });
    res.status(200).json({ deletedCount, requested: ids.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
