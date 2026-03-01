const WorkSheet = require('../models/Worksheet');
const UserSubjectTitle = require('../models/UserSubjectTitle');

/**
 * Check if a user is allowed to access a worksheet.
 * Any authenticated user can access any worksheet (matches GET /worksheets
 * which returns all worksheets with no user filter). Optionally enforce
 * strict access by setting ENV WORKSHEET_STRICT_ACCESS=1 (require approved
 * UserSubjectTitle for the worksheet's subject_title_id).
 * @param {number} userId - User ID (from JWT)
 * @param {string} userType - User type (e.g. 'admin', 'user')
 * @param {number} worksheetId - Worksheet ID
 * @returns {Promise<{ allowed: boolean, worksheet?: object }>}
 */
async function canUserAccessWorksheet(userId, userType, worksheetId) {
  const worksheet = await WorkSheet.findByPk(worksheetId);
  if (!worksheet) {
    return { allowed: false };
  }

  const strictAccess = process.env.WORKSHEET_STRICT_ACCESS === '1';
  if (!strictAccess) {
    return { allowed: true, worksheet };
  }

  if (userType === 'admin') {
    return { allowed: true, worksheet };
  }

  const approved = await UserSubjectTitle.findOne({
    where: {
      user_id: userId,
      subject_title_id: worksheet.subject_title_id,
      status: 'approved',
    },
  });

  return {
    allowed: !!approved,
    worksheet,
  };
}

module.exports = {
  canUserAccessWorksheet,
};
