const express = require("express");
const router = express.Router();
const {
  getAllUser,
  activateUser,
  deActivateUser,
  deleteUser,
  getAllActivateUser,
  getAllDeActivateUser,
  userAnalysis,
  getPendingUsers,
  getUserSelections,
  approveUserSelections,
  getAllSubjectRequests,
} = require("../controllers/adminController");
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/user", authMiddleware.verifyAdmin, getAllUser);
router.get("/user/analysis", authMiddleware.verifyAdmin, userAnalysis);
router.get("/user/activate", authMiddleware.verifyAdmin, getAllActivateUser);
router.get(
  "/user/deactivate",
  authMiddleware.verifyAdmin,
  getAllDeActivateUser
);
router.get("/pending-users", authMiddleware.verifyAdmin, getPendingUsers);
router.get("/subject-requests", authMiddleware.verifyAdmin, getAllSubjectRequests);
router.get("/user/:id/selections", authMiddleware.verifyAdmin, getUserSelections);
router.put("/activate/:id", authMiddleware.verifyAdmin, activateUser);
router.post("/approve-selections/:id", authMiddleware.verifyAdmin, approveUserSelections);
router.put("/deactivate/:id", authMiddleware.verifyAdmin, deActivateUser);
router.delete("/user/delete/:id", authMiddleware.verifyAdmin, deleteUser);

module.exports = router;
