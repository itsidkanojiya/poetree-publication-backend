const Standard = require('../models/Standard');

// Get all standards (for dropdowns / admin) - sorted by sort_order
exports.getAllStandards = async (req, res) => {
  try {
    const standards = await Standard.findAll({
      order: [['sort_order', 'ASC'], ['standard_id', 'ASC']],
      attributes: ['standard_id', 'name', 'sort_order', 'type'],
    });
    res.status(200).json({ success: true, standards });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Get one standard by id
exports.getStandardById = async (req, res) => {
  try {
    const { id } = req.params;
    const standard = await Standard.findByPk(id);
    if (!standard) return res.status(404).json({ message: 'Standard not found' });
    res.status(200).json(standard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Add standard (admin)
exports.addStandard = async (req, res) => {
  try {
    const { name, sort_order, type } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'name is required' });
    }
    const standard = await Standard.create({
      name: name.trim(),
      sort_order: sort_order != null ? parseInt(sort_order, 10) : 0,
      type: type ? type.trim() : null,
    });
    res.status(201).json({ message: 'Standard added successfully', standard });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Edit standard (admin)
exports.editStandard = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sort_order, type } = req.body;
    const standard = await Standard.findByPk(id);
    if (!standard) return res.status(404).json({ message: 'Standard not found' });
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (sort_order !== undefined) updates.sort_order = parseInt(sort_order, 10);
    if (type !== undefined) updates.type = type ? type.trim() : null;
    await standard.update(updates);
    res.status(200).json({ message: 'Standard updated successfully', standard });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Delete standard (admin)
exports.deleteStandard = async (req, res) => {
  try {
    const { id } = req.params;
    const standard = await Standard.findByPk(id);
    if (!standard) return res.status(404).json({ message: 'Standard not found' });
    await standard.destroy();
    res.status(200).json({ message: 'Standard deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
