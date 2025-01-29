const { Subject, SubjectTitle } = require('../models/Subjects');

// Add Subject
exports.addSubject = async (req, res) => {
    try {
        const { subject_name, classes } = req.body; // Accept classes as an array
        const subject = await Subject.create({ subject_name, classes });
        res.status(201).json({ message: 'Subject added successfully', subject });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Add Subject Title
exports.addSubjectTitle = async (req, res) => {
    try {
        const { title_name, subject_id, classes } = req.body; // Accept classes as an array
        const subjectTitle = await SubjectTitle.create({ title_name, subject_id, classes });
        res.status(201).json({ message: 'Subject title added successfully', subjectTitle });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Edit Subject
exports.editSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const { subject_name, classes } = req.body;
        const subject = await Subject.findByPk(id);
        if (!subject) return res.status(404).json({ message: 'Subject not found' });
        await subject.update({ subject_name, classes });
        res.status(200).json({ message: 'Subject updated successfully', subject });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Edit Subject Title
exports.editSubjectTitle = async (req, res) => {
    try {
        const { id } = req.params;
        const { title_name, classes } = req.body;
        const subjectTitle = await SubjectTitle.findByPk(id);
        if (!subjectTitle) return res.status(404).json({ message: 'Subject title not found' });
        await subjectTitle.update({ title_name, classes });
        res.status(200).json({ message: 'Subject title updated successfully', subjectTitle });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get All Subjects
exports.getAllSubjects = async (req, res) => {
    try {
        const subjects = await Subject.findAll({
            include: {
                model: SubjectTitle,
            },
        });
        res.status(200).json(subjects);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.getSubjectTitlesBySubjectId = async (req, res) => {
    try {
        const { subject_id } = req.params;

        // Find subject and associated titles
        const subjectTitles = await SubjectTitle.findAll({
            where: { subject_id },
            attributes: ['subject_title_id', 'title_name', 'classes'], // Include classes (JSON array)
        });

        if (!subjectTitles.length) {
            return res.status(404).json({ message: 'No subject titles found for the given subject' });
        }

        res.status(200).json(subjectTitles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getClassesBySubjectTitleId = async (req, res) => {
    try {
        const { subject_title_id } = req.params;

        // Find the subject title by ID
        const subjectTitle = await SubjectTitle.findByPk(subject_title_id, {
            attributes: ['classes'], // Only fetch the 'classes' field
        });

        if (!subjectTitle) {
            return res.status(404).json({ message: 'Subject title not found' });
        }

        // Return the classes JSON array
        res.status(200).json(subjectTitle.classes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
// Delete Subject
exports.deleteSubject = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the subject by ID
        const subject = await Subject.findByPk(id);
        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }

        // Delete the subject
        await subject.destroy();
        res.status(200).json({ message: 'Subject deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
// Delete Subject Title
exports.deleteSubjectTitle = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the subject title by ID
        const subjectTitle = await SubjectTitle.findByPk(id);
        if (!subjectTitle) {
            return res.status(404).json({ message: 'Subject title not found' });
        }

        // Delete the subject title
        await subjectTitle.destroy();
        res.status(200).json({ message: 'Subject title deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
