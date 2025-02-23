const AnswerSheet = require("../models/AnswerSheet");
const { Subject, SubjectTitle, Boards } = require("../models/Subjects");
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
    } = req.body;

    // Check if required fields are missing
    if (!subject_id || !board_id || !subject_title_id || !standardLevel) {
      return res.status(400).json({
        error: 'Missing required fields: subject_id, board_id, subject_title_id, standard',
      });
    }

    // Check if the files were uploaded correctly
    const answersheetUrl = req.files && req.files.answersheet_url ? 
      `uploads/answersheet/pdf/${req.files.answersheet_url[0].filename}` : null;

    const answersheetCoverLink = req.files && req.files.answersheet_coverlink ? 
      `uploads/answersheet/coverlink/${req.files.answersheet_coverlink[0].filename}` : null;

    if (!answersheetUrl) {
      return res.status(400).json({ error: 'Missing required file: answersheet_url (PDF)' });
    }
console.log(answersheetUrl);
console.log(answersheetCoverLink);
    // Create the answer sheet record with file paths
    const answersheet = await AnswerSheet.create({
      subject_id,
      answer_sheet_url: answersheetUrl,
      answer_sheet_coverlink: answersheetCoverLink,
      subject_title_id,
      board_id,
      standard: standardLevel,  // Maps to 'standard' column in DB
    });

    // Generate base URL for the file
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const formattedAnswersheet = {
      ...answersheet.toJSON(),
      answer_sheet_url: answersheet.answer_sheet_url ? `${baseUrl}/${answersheet.answer_sheet_url}` : null,
      answer_sheet_coverlink: answersheet.answer_sheet_coverlink ? `${baseUrl}/${answersheet.answer_sheet_coverlink}` : null,
    };

    return res.status(200).json({ success: true, answersheet: formattedAnswersheet });

  } catch (err) {
    console.error(err);  // Log the error for better debugging
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
        "answer_sheet_url",
        "answer_sheet_logo",
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

    // Transform the response to flatten the subject field
    const formattedAnswerSheets = answerSheets.map((sheet) => ({
      ...sheet.toJSON(),
      subject: sheet.subject ? sheet.subject.subject_name : null,
      subject_title: sheet.subject_title
        ? sheet.subject_title.title_name
        : null,
      board: sheet.board ? sheet.board.board_name : null,
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
    const answerSheet = await AnswerSheet.findByPk(id);
    if (!answerSheet)
      return res.status(404).json({ message: "Answer sheet not found" });
    await answerSheet.destroy();
    res.status(200).json({ message: "Answer sheet deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
