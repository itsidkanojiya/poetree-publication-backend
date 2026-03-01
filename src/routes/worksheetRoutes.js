 const express = require('express');
const rateLimit = require('express-rate-limit');
const { addWorkSheet, getAllWorkSheets, deleteWorkSheet, getPersonalizedPdf } = require('../controllers/worksheetController');
const router = express.Router();
const upload = require('../middlewares/upload');
const verifyToken = require('../middlewares/verifyToken');

const personalizedPdfLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  keyGenerator: (req) => {
    const userId = req.user?.id ?? req.user?.user_id;
    return userId ? `user:${userId}` : req.ip || 'anonymous';
  },
});

router.post(
  '/add',
  upload.fields([
    { name: 'worksheet_url', maxCount: 1 },
    { name: 'worksheet_coverlink', maxCount: 1 },
  ]),
  addWorkSheet
);

// Get All Worksheets
router.get('/', getAllWorkSheets);

// Personalized PDF (view/download) - authenticated users only (401 if no token)
router.get(
  '/:id/personalized-pdf',
  (req, res, next) => {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader || (!authHeader.startsWith('Bearer ') && !authHeader.startsWith('bearer '))) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    next();
  },
  verifyToken,
  personalizedPdfLimiter,
  getPersonalizedPdf
);

// Delete Worksheet
router.delete('/:id', deleteWorkSheet);

module.exports = router;
