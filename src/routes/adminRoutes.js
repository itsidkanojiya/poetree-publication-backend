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
router.put("/activate/:id", authMiddleware.verifyAdmin, activateUser);
router.put("/deactivate/:id", authMiddleware.verifyAdmin, deActivateUser);
router.delete("/user/delete/:id", authMiddleware.verifyAdmin, deleteUser);

module.exports = router;
