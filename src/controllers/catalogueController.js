const Catalogue = require("../models/Catalogue");

exports.getCatalogues = async (req, res) => {
  try {
    const catalogueItems = await Catalogue.findAll();

    const parsedCatalogue = catalogueItems.map((item) => ({
      catalogue_id: item.catalogue_id,
      catalogue_name: item.catalogue_name,
      catalogue_image_url: item.catalogue_image_url,
      catalogue_pdf_link: item.catalogue_pdf_link,
    }));
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed To Fetch Catalogue.", details: err.message });
  }
};

exports.postCatalogue = async (req, res) => {
  try {
    const { catalogue_name, catalogue_image_url, catalogue_pdf_link } =
      req.body;

    if (!catalogue_name || !catalogue_image_url || !catalogue_pdf_link) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const catalogue = await Catalogue.create({
      catalogue_name,
      catalogue_image_url,
      catalogue_pdf_link,
    });

    res.status(201).json({
      message: "Catalogue Created Successfully.",
        catalogue_id: catalogue_id,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Internal server error.", details: err.message });
  }
};
