 
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
exports.addClass = async (req, res) => {
    try {
        const { class_level, subject_title_id } = req.body;
        const classData = await Class.create({ class_level, subject_title_id });
        res.status(201).json({ message: 'Class added successfully', classData });
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

// Edit Class
exports.editClass = async (req, res) => {
    try {
        const { id } = req.params;
        const { class_level } = req.body;
        const classItem = await Class.findByPk(id);
        if (!classItem) return res.status(404).json({ message: 'Class not found' });
        await classItem.update({ class_level });
        res.status(200).json({ message: 'Class updated successfully', classItem });
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

// Delete Class
exports.deleteClass = async (req, res) => {
    try {
        const { id } = req.params;
        const classItem = await Class.findByPk(id);
        if (!classItem) return res.status(404).json({ message: 'Class not found' });
        await classItem.destroy();
        res.status(200).json({ message: 'Class deleted successfully' });
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
