const AnswerSheet = require("../models/AnswerSheet");
const UserSubjectTitle = require("../models/UserSubjectTitle");
const path = require("path");
const fs = require("fs");
const { Op } = require("sequelize");
const { Subject, SubjectTitle, Boards } = require("../models/Subjects");
const Standard = require("../models/Standard");

async function getStandardNamesMap(standardIds) {
  if (!standardIds || standardIds.length === 0) return new Map();
  const ids = [...new Set(standardIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id)))];
  if (ids.length === 0) return new Map();
  const rows = await Standard.findAll({
    where: { standard_id: { [Op.in]: ids } },
    attributes: ['standard_id', 'name'],
  });
  const map = new Map();
  rows.forEach(r => map.set(r.standard_id, r.name));
  return map;
}
// Define Associations
AnswerSheet.belongsTo(Subject, { foreignKey: "subject_id", as: "subject" });
AnswerSheet.belongsTo(SubjectTitle, {
  foreignKey: "subject_title_id",
  as: "subject_title",
});
AnswerSheet.belongsTo(Boards, { foreignKey: "board_id", as: "board" });
Subject.hasMany(AnswerSheet, { foreignKey: "subject_id" });
SubjectTitle.hasMany(AnswerSheet, { foreignKey: "subject_title_id" });
SubjectTitle.hasMany(AnswerSheet, { foreignKey: "board_id" });

// Add Answer Sheet
exports.addAnswerSheet = async (req, res) => {
  try {
    const {
      subject_id,
      board_id,
      subject_title_id,
      standard: standardLevel,
      user_id,
    } = req.body;

    // Get user_id from body or from authenticated user
    const userId = user_id || req.user?.id || req.user?.user_id;

    // Check if required fields are missing 
    if (!subject_id || !board_id || !subject_title_id || !standardLevel) {
      return res.status(400).json({
        error:
          "Missing required fields: subject_id, board_id, subject_title_id, standard",
      });
    }

    // Check if the files were uploaded correctly
    const answersheetUrl =
      req.files && req.files.answersheet_url
        ? `uploads/answersheet/pdf/${req.files.answersheet_url[0].filename}`
        : null;

    const answersheetCoverLink =
      req.files && req.files.answersheet_coverlink
        ? `uploads/answersheet/coverlink/${req.files.answersheet_coverlink[0].filename}`
        : null;

    if (!answersheetUrl) {
      return res
        .status(400)
        .json({ error: "Missing required file: answersheet_url (PDF)" });
    }
console.log(answersheetUrl);
console.log(answersheetCoverLink);
    // Create the answer sheet record with file paths
    const answersheet = await AnswerSheet.create({
      subject_id,
      answersheet_url: answersheetUrl,
      answersheet_coverlink: answersheetCoverLink,
      subject_title_id,
      board_id,
      standard: standardLevel, // Maps to 'standard' column in DB
    });

    // Create UserSubjectTitle entry if user_id is provided
    if (userId) {
      try {
        // Check if UserSubjectTitle already exists
        const existingUserSubjectTitle = await UserSubjectTitle.findOne({
          where: {
            user_id: userId,
            subject_title_id: subject_title_id,
          },
        });

        // Create UserSubjectTitle if it doesn't exist
        if (!existingUserSubjectTitle) {
          await UserSubjectTitle.create({
            user_id: userId,
            subject_id: subject_id,
            subject_title_id: subject_title_id,
            status: 'approved', // Auto-approved when added via answer sheet
            approved_by: req.user?.id || req.user?.user_id || null,
            approved_at: new Date(),
          });
        }
      } catch (userSubjectTitleError) {
        // Log error but don't fail the answer sheet creation
        console.error('Error creating UserSubjectTitle:', userSubjectTitleError);
      }
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const stdName = answersheet.standard != null ? (await getStandardNamesMap([answersheet.standard])).get(parseInt(answersheet.standard, 10)) : null;
    const formattedAnswersheet = {
      ...answersheet.toJSON(),
      answersheet_url: answersheet.answersheet_url
        ? `${baseUrl}/${answersheet.answersheet_url}`
        : null,
      answersheet_coverlink: answersheet.answersheet_coverlink
        ? `${baseUrl}/${answersheet.answersheet_coverlink}`
        : null,
      standard_name: stdName ?? null,
    };

    return res
      .status(200)
      .json({ success: true, answersheet: formattedAnswersheet });
  } catch (err) {
    console.error(err); // Log the error for better debugging
    res.status(400).json({ error: err.message });
  }
};

// Get All Answer Sheets
exports.getAllAnswerSheets = async (req, res) => {
  try {
    const answerSheets = await AnswerSheet.findAll({
      attributes: [
        "answer_sheet_id",
        "standard",
        "answersheet_url",
        "answersheet_coverlink",
        "createdAt",
        "updatedAt",
      ],
      include: [
        {
          model: Subject,
          as: "subject",
          attributes: ["subject_name"],
        },
        {
          model: SubjectTitle,
          as: "subject_title",
          attributes: ["title_name"],
        },
        {
          model: Boards,
          as: "board",
          attributes: ["board_name"],
        },
      ],
    });
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const allStdIds = answerSheets.map(s => s.standard).filter(Boolean);
    const stdMap = await getStandardNamesMap(allStdIds);
    const formattedAnswerSheets = answerSheets.map((sheet) => ({
      ...sheet.toJSON(),
      subject: sheet.subject ? sheet.subject.subject_name : null,
      subject_title: sheet.subject_title ? sheet.subject_title.title_name : null,
      board: sheet.board ? sheet.board.board_name : null,
      standard_name: sheet.standard != null ? stdMap.get(parseInt(sheet.standard, 10)) ?? null : null,
      answersheet_url: `${baseUrl}/${sheet.answersheet_url}`,
      answersheet_coverlink: `${baseUrl}/${sheet.answersheet_coverlink}`,
    }));

    res.status(200).json(formattedAnswerSheets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Delete Answer Sheet

exports.deleteAnswerSheet = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the answer sheet by ID
    const answerSheet = await AnswerSheet.findByPk(id);
    if (!answerSheet) {
      return res.status(404).json({ message: "Answer sheet not found" });
    }

    // Delete the PDF file (answersheet_url)
    if (answerSheet.answersheet_url) {
      const filePath = path.join(
        __dirname,
        "..",
        "..",
        answerSheet.answersheet_url
      ); // Adjust path
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ Deleted file: ${filePath}`);
      } else {
        console.log(`❌ File not found: ${filePath}`);
      }
    }

    // Delete the cover image file (answersheet_coverlink) if it exists
    if (answerSheet.answersheet_coverlink) {
      const coverPath = path.join(
        __dirname,
        "..",
        "..",
        answerSheet.answersheet_coverlink
      );
      if (fs.existsSync(coverPath)) {
        fs.unlinkSync(coverPath);
        console.log(`✅ Deleted cover image: ${coverPath}`);
      } else {
        console.log(`❌ Cover image not found: ${coverPath}`);
      }
    }

    // Delete the answer sheet from the database
    await answerSheet.destroy();

    res.status(200).json({
      message: "Answer sheet and associated files deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
