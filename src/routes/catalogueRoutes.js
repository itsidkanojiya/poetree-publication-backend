const express = require('express');
const {getCatalogues,addCatalogue, deleteCatalogue} = require("../controllers/catalogueController");

const router = express.Router();
router.get('/getCatalogues', getCatalogues);
router.post('/addCatalogue', addCatalogue);
router.delete('/:id', deleteCatalogue);

module.exports = router;

