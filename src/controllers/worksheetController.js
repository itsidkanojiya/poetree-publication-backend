 
const Worksheet = require('../models/Worksheet');
const {Subject,SubjectTitle, Boards} = require('../models/Subjects');

// Define Associations
Worksheet.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });
Worksheet.belongsTo(SubjectTitle, { foreignKey: 'subject_title_id', as: 'subject_title' });
Worksheet.belongsTo(Boards, { foreignKey: 'board_id', as: 'board' });
Subject.hasMany(Worksheet, { foreignKey: 'subject_id' });
SubjectTitle.hasMany(Worksheet, { foreignKey: 'subject_title_id' });
SubjectTitle.hasMany(Worksheet, { foreignKey: 'board_id' });

// Add Worksheet      
exports.addWorksheet = async (req, res) => {
    try {
        const { subject_id, worksheet_url, worksheet_logo } = req.body;
        const worksheet = await Worksheet.create({ subject_id, worksheet_url, worksheet_logo });
        res.status(201).json({ message: 'Worksheet added successfully', worksheet });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Get All Worksheets
exports.getWorksheets = async (req, res) => {
    
    try {
        const workSheets = await Worksheet.findAll({
            attributes: ['worksheet_id', 'class', 'worksheet_url', 'worksheet_logo', 'createdAt', 'updatedAt'],
            include: [
                {
                    model: Subject,
                    as: 'subject',
                    attributes: ['subject_name'],
                },
                {
                    model: SubjectTitle,
                    as: 'subject_title',    
                    attributes: ['title_name'],
                },
                {
                    model: Boards,
                    as: 'board',    
                    attributes: ['board_name'],
                },
               
            ]
        });

        // Transform the response to flatten the subject field
        const formattedworkSheets = workSheets.map(sheet => ({
            ...sheet.toJSON(),
            subject: sheet.subject ? sheet.subject.subject_name : null,
            subject_title: sheet.subject_title ? sheet.subject_title.title_name : null,
            board: sheet.board ? sheet.board.board_name : null
        }));

        res.status(200).json(formattedworkSheets);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};


// Delete Worksheet
exports.deleteWorksheet = async (req, res) => {
    try {
        const { id } = req.params;
        const worksheet = await Worksheet.findByPk(id);
        if (!worksheet) {
            return res.status(404).json({ message: 'Worksheet not found' });
        }
        await worksheet.destroy();
        res.status(200).json({ message: 'Worksheet deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
