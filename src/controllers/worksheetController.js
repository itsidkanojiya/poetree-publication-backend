const WorkSheet = require("../models/Worksheet");
const UserSubjectTitle = require("../models/UserSubjectTitle");
const path = require("path");
const fs = require("fs");
const { Op } = require("sequelize");
const { Subject, SubjectTitle, Boards } = require("../models/Subjects");
const Standard = require("../models/Standard");
const { canUserAccessWorksheet } = require("../helpers/worksheetAccess");
const { getBrandingForUser } = require("../helpers/getBrandingForUser");
const { personalizeWorksheetPdf } = require("../services/worksheetPersonalization");
const personalizedPdfCache = require("../services/personalizedPdfCache");
const personalizationConfig = require("../config/worksheetPersonalization");

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
      user_id,
    } = req.body;

    // Get user_id from body or from authenticated user
    const userId = user_id || req.user?.id || req.user?.user_id;

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
            status: 'approved', // Auto-approved when added via worksheet
            approved_by: req.user?.id || req.user?.user_id || null,
            approved_at: new Date(),
          });
        }
      } catch (userSubjectTitleError) {
        // Log error but don't fail the worksheet creation
        console.error('Error creating UserSubjectTitle:', userSubjectTitleError);
      }
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const stdName = worksheet.standard != null ? (await getStandardNamesMap([worksheet.standard])).get(parseInt(worksheet.standard, 10)) : null;
    const formattedWorksheet = {
      ...worksheet.toJSON(),
      worksheet_url: worksheet.worksheet_url ? `${baseUrl}/${worksheet.worksheet_url}` : null,
      worksheet_coverlink: worksheet.worksheet_coverlink ? `${baseUrl}/${worksheet.worksheet_coverlink}` : null,
      standard_name: stdName ?? null,
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
    const allStdIds = workSheets.map(s => s.standard).filter(Boolean);
    const stdMap = await getStandardNamesMap(allStdIds);
    const formattedWorkSheets = workSheets.map((sheet) => ({
      ...sheet.toJSON(),
      subject: sheet.subject ? sheet.subject.subject_name : null,
      subject_title: sheet.subject_title ? sheet.subject_title.title_name : null,
      board: sheet.board ? sheet.board.board_name : null,
      standard_name: sheet.standard != null ? stdMap.get(parseInt(sheet.standard, 10)) ?? null : null,
      worksheet_url: `${baseUrl}/${sheet.worksheet_url}`,
      worksheet_coverlink: `${baseUrl}/${sheet.worksheet_coverlink}`,
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

    personalizedPdfCache.invalidateByWorksheet(id);

    res.status(200).json({ message: "Answer sheet and associated files deleted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get personalized PDF for a worksheet (user-facing view/download).
 * Requires authentication. User must be allowed to access this worksheet.
 * Returns PDF with header band (school logo + school name).
 */
exports.getPersonalizedPdf = async (req, res) => {
  try {
    const worksheetId = parseInt(req.params.id, 10);
    if (isNaN(worksheetId) || worksheetId < 1) {
      return res.status(400).json({ error: "Invalid worksheet ID" });
    }

    const userId = req.user?.id ?? req.user?.user_id;
    const userType = req.user?.user_type || "user";
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { allowed, worksheet } = await canUserAccessWorksheet(userId, userType, worksheetId);
    if (!allowed) {
      if (!worksheet) {
        return res.status(404).json({ message: "Worksheet not found" });
      }
      return res.status(403).json({ message: "Not allowed to access this worksheet" });
    }

    const action = (req.query.action || "view").toLowerCase() === "download" ? "download" : "view";
    const basePath = path.join(__dirname, "..", "..");
    const canonicalPath = path.join(basePath, worksheet.worksheet_url);

    if (!fs.existsSync(canonicalPath)) {
      return res.status(404).json({ message: "Worksheet file not found" });
    }

    // Audit log
    console.log(
      `[worksheet-personalized-pdf] worksheetId=${worksheetId} userId=${userId} action=${action} at=${new Date().toISOString()}`
    );

    let pdfBuffer = personalizedPdfCache.get(worksheetId, userId);
    let personalized = true;

    if (!pdfBuffer) {
      const branding = await getBrandingForUser(userId);
      const timeoutMs = (personalizationConfig.personalizationTimeoutSeconds || 15) * 1000;

      const personalizationPromise = personalizeWorksheetPdf(canonicalPath, {
        schoolName: branding.schoolName,
        logoPathOrUrl: branding.logoPathOrUrl,
        watermarkOpacity: branding.watermarkOpacity,
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Personalization timeout")), timeoutMs);
      });

      try {
        pdfBuffer = await Promise.race([personalizationPromise, timeoutPromise]);
        personalizedPdfCache.set(worksheetId, userId, pdfBuffer);
      } catch (err) {
        console.warn("[worksheet-personalized-pdf] Personalization failed, serving original:", err.message);
        personalized = false;
        pdfBuffer = fs.readFileSync(canonicalPath);
      }
    }

    const filename = `worksheet-${worksheetId}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("X-Personalized", personalized ? "true" : "false");
    if (action === "download") {
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    } else {
      res.setHeader("Content-Disposition", "inline");
    }
    res.send(pdfBuffer);
  } catch (err) {
    console.error("[worksheet-personalized-pdf]", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "An error occurred while generating the worksheet" });
    }
  }
};

