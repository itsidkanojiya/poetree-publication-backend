const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const {
  addTimeTable,
  getAllTimeTables,
  deleteTimeTable,
  bulkDeleteTimeTables,
} = require('../controllers/timeTableController');

router.post('/add', upload.fields([{ name: 'timetable_pdf', maxCount: 1 }]), addTimeTable);
router.get('/', getAllTimeTables);
router.post('/bulk-delete', bulkDeleteTimeTables);
router.delete('/:id', deleteTimeTable);

module.exports = router;
