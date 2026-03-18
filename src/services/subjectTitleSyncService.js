const User = require("../models/User");
const UserSubject = require("../models/UserSubject");
const UserSubjectTitle = require("../models/UserSubjectTitle");

/**
 * Keeps `user_subjects.status` consistent with the current title rows
 * in `user_subject_titles` for a given user+subject.
 *
 * Priority:
 * - if any title is approved   -> subject is approved
 * - else if any title is pending -> subject is pending
 * - else if any title is rejected -> subject is rejected
 * - else (no title rows) -> subject row is deleted
 *
 * When subjectApprovedExplicitly is true for this subjectId, the subject row
 * is left or set to "approved" and not downgraded to pending (admin approved
 * the subject even if no titles are approved yet).
 */
async function syncSubjectRowStatuses(userId, subjectId, { approvedBy = null, now = null, subjectApprovedExplicitly = false } = {}) {
  const effectiveNow = now || new Date();

  const [approvedCount, pendingCount, rejectedCount] = await Promise.all([
    UserSubjectTitle.count({
      where: { user_id: userId, subject_id: subjectId, status: "approved" },
    }),
    UserSubjectTitle.count({
      where: { user_id: userId, subject_id: subjectId, status: "pending" },
    }),
    UserSubjectTitle.count({
      where: { user_id: userId, subject_id: subjectId, status: "rejected" },
    }),
  ]);

  let desiredStatus = null;
  if (approvedCount > 0) desiredStatus = "approved";
  else if (pendingCount > 0) desiredStatus = "pending";
  else if (rejectedCount > 0) desiredStatus = "rejected";

  // Admin explicitly approved this subject in this request: do not downgrade to pending.
  if (subjectApprovedExplicitly) desiredStatus = "approved";

  const subjectRow = await UserSubject.findOne({
    where: { user_id: userId, subject_id: subjectId },
  });

  // No titles left => remove subject row.
  if (!desiredStatus) {
    if (subjectRow) await subjectRow.destroy();
    return null;
  }

  const updateData = {
    status: desiredStatus,
    approved_by: desiredStatus === "approved" ? approvedBy : null,
    approved_at: desiredStatus === "approved" ? effectiveNow : null,
  };

  if (subjectRow) {
    await subjectRow.update(updateData);
    return desiredStatus;
  }

  await UserSubject.create({
    user_id: userId,
    subject_id: subjectId,
    ...updateData,
  });
  return desiredStatus;
}

async function rebuildUserApprovedArrays(userId) {
  const user = await User.findByPk(userId);
  if (!user) return null;

  const [approvedSubjects, approvedTitles] = await Promise.all([
    UserSubject.findAll({
      where: { user_id: userId, status: "approved" },
      attributes: ["subject_id"],
    }),
    UserSubjectTitle.findAll({
      where: { user_id: userId, status: "approved" },
      attributes: ["subject_title_id"],
    }),
  ]);

  user.subject = approvedSubjects.map((s) => s.subject_id);
  user.subject_title = approvedTitles.map((t) => t.subject_title_id);
  await user.save();

  return user;
}

module.exports = { syncSubjectRowStatuses, rebuildUserApprovedArrays };

