const { Subject, SubjectTitle, Boards } = require('../models/Subjects');
const UserSubjectTitle = require('../models/UserSubjectTitle');
const User = require('../models/User');
const Standard = require('../models/Standard');
const { Op } = require('sequelize');
const sequelize = require('../config/db');

/** Parse standard from DB: can be JSON string "[12,26,27]" or array. Returns array of ids. */
function parseStandardIds(standard) {
    if (standard == null) return [];
    if (Array.isArray(standard)) return standard.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    if (typeof standard === 'string') {
        try {
            const parsed = JSON.parse(standard);
            return Array.isArray(parsed) ? parsed.map(id => parseInt(id, 10)).filter(id => !isNaN(id)) : [];
        } catch {
            return [];
        }
    }
    return [];
}

/** Build map standard_id -> { standard_id, name } for given ids (one query) */
async function getStandardNamesMap(standardIds) {
    if (!standardIds || standardIds.length === 0) return new Map();
    const ids = [...new Set(standardIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id)))];
    if (ids.length === 0) return new Map();
    const rows = await Standard.findAll({
        where: { standard_id: { [Op.in]: ids } },
        attributes: ['standard_id', 'name'],
    });
    const map = new Map();
    rows.forEach(r => map.set(r.standard_id, { standard_id: r.standard_id, name: r.name }));
    return map;
}

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
        const { title_name, subject_id, standard, board_id } = req.body;
        if (!board_id) {
            return res.status(400).json({ error: 'board_id is required' });
        }
        const subjectTitle = await SubjectTitle.create({ title_name, subject_id, standard, board_id });
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
        const { title_name, standard, board_id } = req.body;
        const subjectTitle = await SubjectTitle.findByPk(id);
        if (!subjectTitle) return res.status(404).json({ message: 'Subject title not found' });
        const updates = {};
        if (title_name !== undefined) updates.title_name = title_name;
        if (standard !== undefined) updates.standard = standard;
        if (board_id !== undefined) updates.board_id = board_id;
        await subjectTitle.update(updates);
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
        const { subject_id, standard, board_id } = req.query;
        const where = {};
        if (subject_id) {
            const sid = parseInt(subject_id, 10);
            if (!isNaN(sid)) where.subject_id = sid;
        }
        if (board_id !== undefined && board_id !== '') {
            const bid = parseInt(board_id, 10);
            if (!isNaN(bid)) where.board_id = bid;
        }
        if (standard !== undefined && standard !== '') {
            const stdId = parseInt(standard, 10);
            if (!isNaN(stdId)) {
                where[Op.and] = where[Op.and] || [];
                where[Op.and].push(sequelize.literal(`JSON_CONTAINS(\`SubjectTitle\`.\`standard\`, CAST(${stdId} AS JSON), '$')`));
            }
        }
        const subjectTitles = await SubjectTitle.findAll({
            where,
            include: [
                { model: Subject, attributes: ['subject_name'] },
                { model: Boards, as: 'board', attributes: ['board_id', 'board_name'] },
            ],
            raw: true,
            nest: true
        });

        const allStdIds = subjectTitles.flatMap(item => parseStandardIds(item.standard));
        const stdMap = await getStandardNamesMap(allStdIds);

        const formatted = subjectTitles.map(item => {
            const stdIds = parseStandardIds(item.standard);
            const standards = stdIds.map(sid => stdMap.get(sid) || { standard_id: sid, name: String(sid) });
            return {
                subject_title_id: item.subject_title_id,
                title_name: item.title_name,
                subject_id: item.subject_id,
                subject: item.Subject?.subject_name,
                standard: stdIds,
                standards: standards,
                board_id: item.board_id,
                board: item.board?.board_name ?? null,
            };
        });

        res.status(200).json(formatted);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getSubjectTitlesBySubjectId = async (req, res) => {
    try {
        const { subject_id } = req.params;
        const { standard, board_id } = req.query;
        let where = { subject_id };
        const conditions = [{ subject_id }];
        if (board_id !== undefined && board_id !== '') {
            const bid = parseInt(board_id, 10);
            if (!isNaN(bid)) conditions.push({ board_id: bid });
        }
        if (standard !== undefined && standard !== '') {
            const stdId = parseInt(standard, 10);
            if (!isNaN(stdId)) conditions.push(sequelize.literal(`JSON_CONTAINS(\`SubjectTitle\`.\`standard\`, CAST(${stdId} AS JSON), '$')`));
        }
        if (conditions.length > 1) where = { [Op.and]: conditions };
        const subjectTitles = await SubjectTitle.findAll({
            where,
            attributes: ['subject_title_id', 'title_name', 'standard', 'board_id', 'subject_id'],
            include: [
                { model: Subject, attributes: ['subject_id', 'subject_name'] },
                { model: Boards, as: 'board', attributes: ['board_id', 'board_name'] },
            ],
        });

        if (!subjectTitles.length) {
            return res.status(404).json({ message: 'No subject titles found for the given subject and standard' });
        }

        const allStdIds = subjectTitles.flatMap(st => parseStandardIds(st.standard));
        const stdMap = await getStandardNamesMap(allStdIds);

        const withBoard = subjectTitles.map(st => {
            const stdIds = parseStandardIds(st.standard);
            const standards = stdIds.map(sid => stdMap.get(sid) || { standard_id: sid, name: String(sid) });
            return {
                subject_title_id: st.subject_title_id,
                title_name: st.title_name,
                subject_id: st.subject_id,
                subject: st.Subject?.subject_name ?? null,
                standard: stdIds,
                standards: standards,
                board_id: st.board_id,
                board: st.board ? st.board.board_name : null,
            };
        });
        res.status(200).json(withBoard);
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

        const titleId = parseInt(id, 10);

        // 1. Delete all user_subject_titles that reference this subject_title_id
        await UserSubjectTitle.destroy({
            where: { subject_title_id: titleId },
        });

        // 2. Clear subject_title for users who had this subject_title_id (column is INTEGER: single id or null)
        const users = await User.findAll({
            where: { user_type: 'user' },
            attributes: ['id', 'subject_title'],
        });
        for (const user of users) {
            const current = user.subject_title;
            if (current == null) continue;
            let shouldClear = false;
            if (Array.isArray(current)) {
                shouldClear = current.includes(titleId);
            } else if (typeof current === 'string') {
                try {
                    const parsed = JSON.parse(current);
                    shouldClear = Array.isArray(parsed) ? parsed.includes(titleId) : parseInt(current, 10) === titleId;
                } catch {
                    shouldClear = parseInt(current, 10) === titleId;
                }
            } else {
                shouldClear = parseInt(current, 10) === titleId;
            }
            if (shouldClear) {
                await User.update(
                    { subject_title: null },
                    { where: { id: user.id } }
                );
            }
        }

        // 3. Delete the subject title
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
