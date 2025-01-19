 
const express = require('express');
const router = express.Router();
const {
    addHeader,
    editHeader,
    getHeaders,
    deleteHeader,
} = require('../controllers/headerController');

// Add Header
router.post('/add', addHeader);

// Edit Header
router.put('/edit/:id', editHeader);

// Get All Headers
router.get('/all', getHeaders);

// Delete Header
router.delete('/delete/:id', deleteHeader);

module.exports = router;
