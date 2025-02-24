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
      answersheet_url: answersheetUrl,
      answersheet_coverlink: answersheetCoverLink,
      subject_title_id,
      board_id,
      standard: standardLevel,  // Maps to 'standard' column in DB
    });

    // Generate base URL for the file
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const formattedAnswersheet = {
      ...answersheet.toJSON(),
      answersheet_url: answersheet.answersheet_url ? `${baseUrl}/${answersheet.answersheet_url}` : null,
      answersheet_coverlink: answersheet.answersheet_coverlink ? `${baseUrl}/${answersheet.answersheet_coverlink}` : null,
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
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    // Transform the response to flatten the subject field
    const formattedAnswerSheets = answerSheets.map((sheet) => ({
      ...sheet.toJSON(),
      subject: sheet.subject ? sheet.subject.subject_name : null,
      subject_title: sheet.subject_title
        ? sheet.subject_title.title_name
        : null,
      board: sheet.board ? sheet.board.board_name : null,
      answersheet_url:  `${baseUrl}/${sheet.answersheet_url}` ,
      answersheet_coverlink: `${baseUrl}/${sheet.answersheet_coverlink}` ,
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
      const filePath = path.join(__dirname, '..', '..', answerSheet.answersheet_url); // Adjust path
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ Deleted file: ${filePath}`);
      } else {
        console.log(`❌ File not found: ${filePath}`);
      }
    }

    // Delete the cover image file (answersheet_coverlink) if it exists
    if (answerSheet.answersheet_coverlink) {
      const coverPath = path.join(__dirname, '..', '..', answerSheet.answersheet_coverlink);
      if (fs.existsSync(coverPath)) {
        fs.unlinkSync(coverPath);
        console.log(`✅ Deleted cover image: ${coverPath}`);
      } else {
        console.log(`❌ Cover image not found: ${coverPath}`);
      }
    }

    // Delete the answer sheet from the database
    await answerSheet.destroy();

    res.status(200).json({ message: "Answer sheet and associated files deleted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

