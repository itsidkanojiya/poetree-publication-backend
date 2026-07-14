const express = require("express");
const {
  addQuestion,
  editQuestion,
  deleteQuestion,
  bulkDeleteQuestions,
  getAllQuestions,
  getQuestionStats,
  questionAnalysis,
  uploadInlineImage,
} = require("../controllers/questionController");
const authMiddleware = require("../middlewares/authMiddleware");
const verifyToken = require("../middlewares/verifyToken");
const upload = require("../middlewares/upload");

const router = express.Router();

// Accept the legacy single `image`, the flattened `composite_image`, and multiple
// source images (`images[]`) in one multipart request.
const questionUpload = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "composite_image", maxCount: 1 },
  { name: "images[]", maxCount: 20 },
  { name: "images", maxCount: 20 },
]);

// Inline image upload for the rich-text editor (returns a URL to embed in question_html).
router.post(
  "/upload-image",
  authMiddleware.verifyAdmin,
  upload.single("image"),
  uploadInlineImage
);

router.post("/add", authMiddleware.verifyAdmin, questionUpload, addQuestion);
router.put("/edit/:id", authMiddleware.verifyAdmin, questionUpload, editQuestion);
router.delete("/delete/:id", authMiddleware.verifyAdmin, deleteQuestion);
router.post("/bulk-delete", authMiddleware.verifyAdmin, bulkDeleteQuestions);
router.get("/", getAllQuestions);
router.get("/stats", verifyToken, getQuestionStats);
router.get("/analysis", questionAnalysis);

module.exports = router;
