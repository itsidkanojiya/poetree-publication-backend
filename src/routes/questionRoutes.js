const express = require("express");
const {
  addQuestion,
  editQuestion,
  deleteQuestion,
  getAllQuestions,
  getQuestionStats,
  questionAnalysis,
} = require("../controllers/questionController");
const authMiddleware = require("../middlewares/authMiddleware");
const verifyToken = require("../middlewares/verifyToken");
const upload = require("../middlewares/upload");

const router = express.Router();

router.post("/add", authMiddleware.verifyAdmin, upload.single("image"), addQuestion);
router.put("/edit/:id", authMiddleware.verifyAdmin, upload.single("image"), editQuestion);
router.delete("/delete/:id", authMiddleware.verifyAdmin, deleteQuestion);
router.get("/", getAllQuestions);
router.get("/stats", verifyToken, getQuestionStats);
router.get("/analysis", questionAnalysis);

module.exports = router;
