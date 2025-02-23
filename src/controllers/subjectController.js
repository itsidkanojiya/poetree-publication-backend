const { Subject, SubjectTitle ,Boards} = require('../models/Subjects');

// Add Subject
exports.addSubject = async (req, res) => {
    try {
        const { subject_name, standard } = req.body; // Accept standard as an array
        const subject = await Subject.create({ subject_name, standard });
        res.status(201).json({ message: 'Subject added successfully', subject });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Add Subject Title
exports.addSubjectTitle = async (req, res) => {
    try {
        const { title_name, subject_id, standard } = req.body; // Accept standard as an array
        const subjectTitle = await SubjectTitle.create({ title_name, subject_id, standard });
        res.status(201).json({ message: 'Subject title added successfully', subjectTitle });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Edit Subject
exports.editSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const { subject_name, standard } = req.body;
        const subject = await Subject.findByPk(id);
        if (!subject) return res.status(404).json({ message: 'Subject not found' });
        await subject.update({ subject_name, standard });
        res.status(200).json({ message: 'Subject updated successfully', subject });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Edit Subject Title
exports.editSubjectTitle = async (req, res) => {
    try {
        const { id } = req.params;
        const { title_name, standard } = req.body;
        const subjectTitle = await SubjectTitle.findByPk(id);
        if (!subjectTitle) return res.status(404).json({ message: 'Subject title not found' });
        await subjectTitle.update({ title_name, standard });
        res.status(200).json({ message: 'Subject title updated successfully', subjectTitle });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get All Subjects
exports.getAllSubjects = async (req, res) => {
    try {
        const subjects = await Subject.findAll({
         
        });
        res.status(200).json(subjects);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.getAllSubjectTitle = async (req, res) => {
    try {
        const subjectTitle = await SubjectTitle.findAll({
          
        });
        res.status(200).json(subjectTitle);
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
            attributes: ['subject_title_id', 'title_name', 'standard'], // Include standard (JSON array)
        });

        if (!subjectTitles.length) {
            return res.status(404).json({ message: 'No subject titles found for the given subject' });
        }

        res.status(200).json(subjectTitles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getstandardBySubjectTitleId = async (req, res) => {
    try {
        const { subject_title_id } = req.params;

        // Find the subject title by ID
        const subjectTitle = await SubjectTitle.findByPk(subject_title_id, {
            attributes: ['standard'], // Only fetch the 'standard' field
        });

        if (!subjectTitle) {
            return res.status(404).json({ message: 'Subject title not found' });
        }

        // Return the standard JSON array
        res.status(200).json(subjectTitle.standard);
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
// Add Boards
exports.addBoard = async (req, res) => {
    try {
        const { board_name } = req.body; // Accept standard as an array
        const board = await Boards.create({ board_name });
        res.status(201).json({ message: 'Board added successfully', board });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.getAllBoards = async (req, res) => {
    try {
        const boards = await Boards.findAll(); // No need to include itself
        res.status(200).json(boards);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
