const express = require('express');
const {getCatalogues,addCatalogue, deleteCatalogue} = require("../controllers/catalogueController");

const router = express.Router();
router.get('/', getCatalogues);
router.post('/add', addCatalogue);
router.delete('/delete/:id', deleteCatalogue);

module.exports = router;

