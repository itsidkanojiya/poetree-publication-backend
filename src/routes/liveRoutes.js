const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');
const {
  startSession,
  getSession,
  setCurrent,
  reveal,
  endSession,
  getPublicSession,
} = require('../controllers/liveController');

// Teacher control routes (require auth)
router.post('/start', verifyToken, startSession);
router.get('/session/:sessionId', verifyToken, getSession);
router.patch('/session/:sessionId/current', verifyToken, setCurrent);
router.post('/session/:sessionId/reveal', verifyToken, reveal);
router.post('/session/:sessionId/end', verifyToken, endSession);

// Public session state (no auth) — order matters: more specific path first
router.get('/public/code/:sessionCode', getPublicSession);
router.get('/public/:sessionId', getPublicSession);

module.exports = router;
