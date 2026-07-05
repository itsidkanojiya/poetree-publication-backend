const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const {
  addPlanner,
  getAllPlanners,
  deletePlanner,
  bulkDeletePlanners,
} = require('../controllers/plannerController');

router.post('/add', upload.fields([{ name: 'planner_pdf', maxCount: 1 }]), addPlanner);
router.get('/', getAllPlanners);
router.post('/bulk-delete', bulkDeletePlanners);
router.delete('/:id', deletePlanner);

module.exports = router;
