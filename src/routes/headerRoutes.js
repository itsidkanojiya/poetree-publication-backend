const express = require('express');
const router = express.Router();
const {
    addHeader,
    editHeader,
    deleteHeader,
    getHeadersByUserId,
} = require('../controllers/headerController');

router.post('/add', addHeader);
router.put('/edit/:id', editHeader);
router.delete('/delete/:id', deleteHeader);
router.get('/user/:user_id', getHeadersByUserId);

module.exports = router;
