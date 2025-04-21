const  WorkSheet  = require("../models/Worksheet");

const { Subject, SubjectTitle, Boards } = require("../models/Subjects");
// Define Associations
WorkSheet.belongsTo(Subject, { foreignKey: "subject_id", as: "subject" });
WorkSheet.belongsTo(SubjectTitle, {
  foreignKey: "subject_title_id",
  as: "subject_title",
});
WorkSheet.belongsTo(Boards, { foreignKey: "board_id", as: "board" });
Subject.hasMany(WorkSheet, { foreignKey: "subject_id" });
SubjectTitle.hasMany(WorkSheet, { foreignKey: "subject_title_id" });
SubjectTitle.hasMany(WorkSheet, { foreignKey: "board_id" });

// Add Answer Sheet
exports.addWorkSheet = async (req, res) => {
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
    const worksheetUrl = req.files && req.files.worksheet_url ? 
      `uploads/worksheet/pdf/${req.files.worksheet_url[0].filename}` : null;

    const worksheetCoverLink = req.files && req.files.worksheet_coverlink ? 
      `uploads/worksheet/coverlink/${req.files.worksheet_coverlink[0].filename}` : null;

    if (!worksheetUrl) {
      return res.status(400).json({ error: 'Missing required file: worksheet_url (PDF)' });
    }
console.log(worksheetUrl);
console.log(worksheetCoverLink);
    // Create the answer sheet record with file paths
    const worksheet = await WorkSheet.create({
      subject_id,
      worksheet_url: worksheetUrl,
      worksheet_coverlink: worksheetCoverLink,
      subject_title_id,
      board_id,
      standard: standardLevel,  // Maps to 'standard' column in DB
    });

    // Generate base URL for the file
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const formattedWorksheet = {
      ...worksheet.toJSON(),
      worksheet_url: worksheet.worksheet_url ? `${baseUrl}/${worksheet.worksheet_url}` : null,
      worksheet_coverlink: worksheet.worksheet_coverlink ? `${baseUrl}/${worksheet.worksheet_coverlink}` : null,
    };

    return res.status(200).json({ success: true, worksheet: formattedWorksheet });

  } catch (err) {
    console.error(err);  // Log the error for better debugging
    res.status(400).json({ error: err.message });
  }
};

// Get All Answer Sheets
exports.getAllWorkSheets = async (req, res) => {
  try {
    const workSheets = await WorkSheet.findAll({
      attributes: [
        "worksheet_id",
        "standard",
        "worksheet_url",
        "worksheet_coverlink",
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
    const formattedWorkSheets = workSheets.map((sheet) => ({
      ...sheet.toJSON(),
      subject: sheet.subject ? sheet.subject.subject_name : null,
      subject_title: sheet.subject_title
        ? sheet.subject_title.title_name
        : null,
      board: sheet.board ? sheet.board.board_name : null,
      worksheet_url:  `${baseUrl}/${sheet.worksheetCoverLink}` ,
      worksheet_coverlink: `${baseUrl}/${sheet.worksheet_coverlink}` ,
    }));

    res.status(200).json(formattedWorkSheets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Delete Answer Sheet

exports.deleteWorkSheet = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the answer sheet by ID
    const answerSheet = await WorkSheet.findByPk(id);
    if (!answerSheet) {
      return res.status(404).json({ message: "Answer sheet not found" });
    }

    // Delete the PDF file (worksheet_url)
    if (answerSheet.worksheet_url) {
      const filePath = path.join(__dirname, '..', '..', answerSheet.worksheet_url); // Adjust path
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ Deleted file: ${filePath}`);
      } else {
        console.log(`❌ File not found: ${filePath}`);
      }
    }

    // Delete the cover image file (worksheet_coverlink) if it exists
    if (answerSheet.worksheet_coverlink) {
      const coverPath = path.join(__dirname, '..', '..', answerSheet.worksheet_coverlink);
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

