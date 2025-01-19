 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { Op } = require('sequelize');
const { Subject, SubjectTitle, Class } = require('../models/Subjects');

exports.addSubject = async (req, res) => {
    try {
        const { name } = req.body;
        const subject = await Subject.create({ name });
        res.status(201).json({ message: 'Subject added successfully', subject });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.addSubjectTitle = async (req, res) => {
    try {
        const { title, subject_id } = req.body;
        const subjectTitle = await SubjectTitle.create({ title, subject_id });
        res.status(201).json({ message: 'Subject title added successfully', subjectTitle });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Edit Subject
exports.editSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const subject = await Subject.findByPk(id);
        if (!subject) return res.status(404).json({ message: 'Subject not found' });
        await subject.update({ name });
        res.status(200).json({ message: 'Subject updated successfully', subject });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Edit Subject Title
exports.editSubjectTitle = async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;
        const subjectTitle = await SubjectTitle.findByPk(id);
        if (!subjectTitle) return res.status(404).json({ message: 'Subject title not found' });
        await subjectTitle.update({ title });
        res.status(200).json({ message: 'Subject title updated successfully', subjectTitle });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};



// Delete Subject
exports.deleteSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const subject = await Subject.findByPk(id);
        if (!subject) return res.status(404).json({ message: 'Subject not found' });
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
        const subjectTitle = await SubjectTitle.findByPk(id);
        if (!subjectTitle) return res.status(404).json({ message: 'Subject title not found' });
        await subjectTitle.destroy();
        res.status(200).json({ message: 'Subject title deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAllSubjects = async (req, res) => {
    try {
        const subjects = await Subject.findAll({
            include: {
                model: SubjectTitle,
                include: {
                    model: Class,
                },
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
            include: {
                model: Class,
            },
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

        // Find classes for the given subject title
        const classes = await Class.findAll({
            where: { subject_title_id },
        });

        if (!classes.length) {
            return res.status(404).json({ message: 'No classes found for the given subject title' });
        }

        res.status(200).json(classes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
