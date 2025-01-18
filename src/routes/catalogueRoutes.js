const express = require('express');
const {getCatalogues,postCatalogue, deleteCatalogue, editCatalogue} = require("../controllers/catalogueController");

const router = express.Router();
router.get('/getCatalogues', getCatalogues);
router.post('/postCatalogue', postCatalogue);
// router.delete('/deleteCatalogue', deleteCatalogue);
// router.post('/editCatalogue', editCatalogue);

module.exports = router;

