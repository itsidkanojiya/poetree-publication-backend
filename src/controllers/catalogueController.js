const Catalogue = require('../models/Catalogue');

exports.getCatalogues = async (req, res) => {
    try {
        const catalogues = await Catalogue.findAll();
        res.status(200).json(catalogues);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addCatalogue = async (req, res) => {
    try {
        const { catalogue_name, catalogue_image_url, catalogue_pdf_link } = req.body;
        const newCatalogue = await Catalogue.create({
            catalogue_name,
            catalogue_image_url,
            catalogue_pdf_link,
        });
        res.status(201).json({ message: 'Catalogue added successfully', newCatalogue });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.deleteCatalogue = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Catalogue.destroy({ where: { catalogue_id: id } });
        if (deleted) {
            res.status(200).json({ message: 'Catalogue deleted successfully' });
        } else {
            res.status(404).json({ message: 'Catalogue not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
