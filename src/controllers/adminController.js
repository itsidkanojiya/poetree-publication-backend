const User = require("../models/User");
const express = require("express");
const { Op } = require("sequelize");
const moment = require("moment");
const { Subject, SubjectTitle } = require("../models/Subjects");
const UserSubject = require("../models/UserSubject");
const UserSubjectTitle = require("../models/UserSubjectTitle");
const { sendActivationStatusEmail } = require("../utils/sendOTPEmail.js");
const { syncSubjectRowStatuses } = require("../services/subjectTitleSyncService");


exports.getAllUser = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { user_type: "user" },
    });

    // Fetch subject and subject title for each user manually
    const formattedUsers = await Promise.all(
      users.map(async (user) => {
        // Handle JSON arrays for subjects and subject_titles
        let subjectNames = null;
        let subjectTitleNames = null;

        if (user.subject) {
          try {
            const subjectIds = typeof user.subject === 'string' ? JSON.parse(user.subject) : user.subject;
            if (Array.isArray(subjectIds) && subjectIds.length > 0) {
              const subjects = await Subject.findAll({
                where: { subject_id: { [Op.in]: subjectIds } },
                attributes: ["subject_id", "subject_name"],
              });
              subjectNames = subjects.map(s => s.subject_name);
            } else if (typeof subjectIds === 'number') {
              // Backward compatibility: single subject ID
              const subjectData = await Subject.findOne({
                where: { subject_id: subjectIds },
                attributes: ["subject_name"],
              });
              subjectNames = subjectData ? [subjectData.subject_name] : null;
            }
          } catch (e) {
            // If parsing fails, try as single integer
            const subjectData = await Subject.findOne({
              where: { subject_id: user.subject },
              attributes: ["subject_name"],
            });
            subjectNames = subjectData ? [subjectData.subject_name] : null;
          }
        }

        if (user.subject_title) {
          try {
            const titleIds = typeof user.subject_title === 'string' ? JSON.parse(user.subject_title) : user.subject_title;
            if (Array.isArray(titleIds) && titleIds.length > 0) {
              const titles = await SubjectTitle.findAll({
                where: { subject_title_id: { [Op.in]: titleIds } },
                attributes: ["subject_title_id", "title_name"],
              });
              subjectTitleNames = titles.map(t => t.title_name);
            } else if (typeof titleIds === 'number') {
              // Backward compatibility: single title ID
              const titleData = await SubjectTitle.findOne({
                where: { subject_title_id: titleIds },
                attributes: ["title_name"],
              });
              subjectTitleNames = titleData ? [titleData.title_name] : null;
            }
          } catch (e) {
            // If parsing fails, try as single integer
            const titleData = await SubjectTitle.findOne({
              where: { subject_title_id: user.subject_title },
              attributes: ["title_name"],
            });
            subjectTitleNames = titleData ? [titleData.title_name] : null;
          }
        }

        // Return formatted user data
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          phone_number: user.phone_number,
          username: user.username,
          user_type: user.user_type,
          school_name: user.school_name,
          school_address_state: user.school_address_state,
          school_address_pincode: user.school_address_pincode,
          school_address_city: user.school_address_city,
          school_principal_name: user.school_principal_name,
          subject: subjectNames, // Array of subject names or null
          subject_title: subjectTitleNames, // Array of title names or null
          is_verified: user.is_verified,
          is_number_verified: user.is_number_verified,
        };
      })
    );

    res.status(200).json(formattedUsers);
  } catch (err) {
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
};


exports.userAnalysis = async (req, res) => {
  try {
    const today = moment().startOf("day");
    const startOfMonth = moment().startOf("month");
    const startOfYear = moment().startOf("year");

    // Count active and pending users
    const activeUsers = await User.count({ where: { is_verified: 1 } });
    const pendingUsers = await User.count({ where: { is_verified: 0 } });

    // Count users registered this month
    const monthlyUsers = await User.count({
      where: {
        created_at: {
          [Op.gte]: startOfMonth.toDate(),
        },
      },
    });

    // Count users registered today
    const dailyUsers = await User.count({
      where: {
        created_at: {
          [Op.gte]: today.toDate(),
        },
      },
    });

    // Users per month for the past 12 months
    let chart = {};
    for (let i = 1; i <= 12; i++) {
      const start = moment()
        .month(i - 1)
        .startOf("month");
      const end = moment()
        .month(i - 1)
        .endOf("month");

      const count = await User.count({
        where: {
          created_at: {
            [Op.between]: [start.toDate(), end.toDate()],
          },
        },
      });
      chart[i] = count;
    }

    res.json({
      active: activeUsers,
      pending: pendingUsers,
      monthly_users: monthlyUsers,
      daily_users: dailyUsers,
      chart: chart,
    });
  } catch (error) {
    console.error("Error fetching user statistics:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
exports.getAllActivateUser = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { user_type: "user", is_verified: 1 },
    });
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.getAllDeActivateUser = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { user_type: "user", is_verified: 0 },
    });
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Get pending users with their selections
exports.getPendingUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { user_type: "user", is_verified: 0 },
      attributes: { exclude: ["password", "otp"] },
    });

    const usersWithSelections = await Promise.all(
      users.map(async (user) => {
        const pendingSubjects = await UserSubject.findAll({
          where: { user_id: user.id, status: "pending" },
          include: [{ model: Subject, as: "subject", attributes: ["subject_id", "subject_name"] }],
        });

        const pendingSubjectTitles = await UserSubjectTitle.findAll({
          where: { user_id: user.id, status: "pending" },
          include: [
            { model: Subject, as: "subject", attributes: ["subject_id", "subject_name"] },
            { model: SubjectTitle, as: "subjectTitle", attributes: ["subject_title_id", "title_name"] },
          ],
        });

        return {
          ...user.toJSON(),
          pending_selections: {
            subjects: pendingSubjects,
            subject_titles: pendingSubjectTitles,
          },
        };
      })
    );

    res.status(200).json(usersWithSelections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all selections for a specific user
exports.getUserSelections = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const [subjects, subjectTitles] = await Promise.all([
      UserSubject.findAll({
        where: { user_id: id },
        include: [{ model: Subject, as: "subject", attributes: ["subject_id", "subject_name"] }],
        order: [["created_at", "DESC"]],
      }),
      UserSubjectTitle.findAll({
        where: { user_id: id },
        include: [
          { model: Subject, as: "subject", attributes: ["subject_id", "subject_name"] },
          { model: SubjectTitle, as: "subjectTitle", attributes: ["subject_title_id", "title_name"] },
        ],
        order: [["created_at", "DESC"]],
      }),
    ]);

    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        is_verified: user.is_verified,
      },
      selections: {
        subjects: {
          pending: subjects.filter(s => s.status === "pending"),
          approved: subjects.filter(s => s.status === "approved"),
          rejected: subjects.filter(s => s.status === "rejected"),
        },
        subject_titles: {
          pending: subjectTitles.filter(st => st.status === "pending"),
          approved: subjectTitles.filter(st => st.status === "approved"),
          rejected: subjectTitles.filter(st => st.status === "rejected"),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

async function rebuildUserApprovedArrays(userId) {
  const user = await User.findByPk(userId);
  if (!user) return null;

  const [approvedSubjects, approvedSubjectTitles] = await Promise.all([
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
  user.subject_title = approvedSubjectTitles.map((st) => st.subject_title_id);
  await user.save();
  return user;
}

// Approve user selections and activate user
// Supports two formats:
// 1) subject_ids / subject_title_ids = row IDs (user_subjects.id, user_subject_titles.id)
// 2) approve_by_subject_ids / approve_by_subject_title_ids = master IDs (subject_id, subject_title_id)
exports.approveUserSelections = async (req, res) => {
  try {
    const { id } = req.params; // user_id
    const {
      subject_ids = [],             // Array of user_subjects.id to approve
      subject_title_ids = [],       // Array of user_subject_titles.id to approve
      approve_by_subject_ids = [],  // Array of subject_id (master) to approve for this user
      approve_by_subject_title_ids = [], // Array of subject_title_id (master) to approve for this user
      reject_others = false,
    } = req.body;

    const adminId = req.user?.id || req.user?.user_id;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const now = new Date();

    // Resolve which user_subjects rows to approve: by row id and/or by subject_id (master)
    let subjectRowIdsToApprove = [];
    if (subject_ids.length > 0) {
      const byRowId = await UserSubject.findAll({
        where: { user_id: id, id: { [Op.in]: subject_ids } },
        attributes: ["id"],
      });
      // Strict mode: subject_ids are row ids only (no fallback to master ids)
      subjectRowIdsToApprove = byRowId.map((r) => r.id);
      if (subjectRowIdsToApprove.length === 0) {
        return res.status(400).json({
          error:
            "No matching subject request rows found for given subject_ids. If you want to approve by master subject_id, send approve_by_subject_ids instead.",
        });
      }
    }
    if (approve_by_subject_ids.length > 0) {
      const bySubjectId = await UserSubject.findAll({
        where: { user_id: id, subject_id: { [Op.in]: approve_by_subject_ids } },
        attributes: ["id"],
      });
      subjectRowIdsToApprove = [...new Set([...subjectRowIdsToApprove, ...bySubjectId.map((r) => r.id)])];
    }

    // Approve selected subjects (by user_subjects.id)
    if (subjectRowIdsToApprove.length > 0) {
      await UserSubject.update(
        {
          status: "approved",
          approved_by: adminId,
          approved_at: now,
        },
        {
          where: {
            id: { [Op.in]: subjectRowIdsToApprove },
            user_id: id,
          },
        }
      );

      if (reject_others) {
        await UserSubject.update(
          {
            status: "rejected",
            approved_by: adminId,
            approved_at: now,
          },
          {
            where: {
              user_id: id,
              id: { [Op.notIn]: subjectRowIdsToApprove },
              status: "pending",
            },
          }
        );
      }
    }

    // Resolve which user_subject_titles rows to approve: by row id and/or by subject_title_id (master)
    let subjectTitleRowIdsToApprove = [];
    if (subject_title_ids.length > 0) {
      const byRowId = await UserSubjectTitle.findAll({
        where: { user_id: id, id: { [Op.in]: subject_title_ids } },
        attributes: ["id"],
      });
      // Strict mode: subject_title_ids are row ids only (no fallback to master ids)
      subjectTitleRowIdsToApprove = byRowId.map((r) => r.id);
      if (subjectTitleRowIdsToApprove.length === 0) {
        return res.status(400).json({
          error:
            "No matching subject title request rows found for given subject_title_ids. If you want to approve by master subject_title_id, send approve_by_subject_title_ids instead.",
        });
      }
    }
    if (approve_by_subject_title_ids.length > 0) {
      const byTitleId = await UserSubjectTitle.findAll({
        where: { user_id: id, subject_title_id: { [Op.in]: approve_by_subject_title_ids } },
        attributes: ["id"],
      });
      subjectTitleRowIdsToApprove = [...new Set([...subjectTitleRowIdsToApprove, ...byTitleId.map((r) => r.id)])];
    }

    // Collect subject_ids that may have their parent status changed.
    // We sync only these subject_ids after we update title rows statuses.
    // Track which subject_ids were explicitly approved (subject row approved) so sync does not downgrade them to pending.
    const affectedSubjectIds = new Set();
    const subjectIdsApprovedExplicitly = new Set();
    if (subjectRowIdsToApprove.length > 0) {
      const subjectRows = await UserSubject.findAll({
        where: { user_id: id, id: { [Op.in]: subjectRowIdsToApprove } },
        attributes: ["subject_id"],
      });
      subjectRows.forEach((r) => {
        affectedSubjectIds.add(r.subject_id);
        subjectIdsApprovedExplicitly.add(r.subject_id);
      });
    }
    if (subjectTitleRowIdsToApprove.length > 0) {
      const titleRows = await UserSubjectTitle.findAll({
        where: { user_id: id, id: { [Op.in]: subjectTitleRowIdsToApprove } },
        attributes: ["subject_id"],
      });
      titleRows.forEach((r) => affectedSubjectIds.add(r.subject_id));
    }
    if (reject_others) {
      // When reject_others=true, other pending rows for the user may change too.
      const pendingSubjectIds = await UserSubject.findAll({
        where: { user_id: id, status: "pending" },
        attributes: ["subject_id"],
      });
      pendingSubjectIds.forEach((r) => affectedSubjectIds.add(r.subject_id));

      const pendingTitleSubjectIds = await UserSubjectTitle.findAll({
        where: { user_id: id, status: "pending" },
        attributes: ["subject_id"],
      });
      pendingTitleSubjectIds.forEach((r) => affectedSubjectIds.add(r.subject_id));
    }

    // Approve selected subject titles (by user_subject_titles.id)
    if (subjectTitleRowIdsToApprove.length > 0) {
      await UserSubjectTitle.update(
        {
          status: "approved",
          approved_by: adminId,
          approved_at: now,
        },
        {
          where: {
            id: { [Op.in]: subjectTitleRowIdsToApprove },
            user_id: id,
          },
        }
      );

      if (reject_others) {
        await UserSubjectTitle.update(
          {
            status: "rejected",
            approved_by: adminId,
            approved_at: now,
          },
          {
            where: {
              user_id: id,
              id: { [Op.notIn]: subjectTitleRowIdsToApprove },
              status: "pending",
            },
          }
        );
      }
    }

    // Sync parent subject statuses derived from current title statuses.
    // Do not downgrade to pending when admin explicitly approved the subject (approve subject only, no titles yet).
    for (const subjectId of affectedSubjectIds) {
      await syncSubjectRowStatuses(id, subjectId, {
        approvedBy: adminId,
        now,
        subjectApprovedExplicitly: subjectIdsApprovedExplicitly.has(subjectId),
      });
    }

    // Rebuild user approved arrays from approved rows
    const updatedUser = await rebuildUserApprovedArrays(id);
    if (!updatedUser) return res.status(404).json({ error: "User not found" });

    const subjectArray = Array.isArray(updatedUser.subject) ? updatedUser.subject : [];
    const subjectTitleArray = Array.isArray(updatedUser.subject_title) ? updatedUser.subject_title : [];

    updatedUser.is_verified = 1; // Activate user

    try {
      await updatedUser.save();
    } catch (saveErr) {
      const msg = saveErr.message || '';
      if (msg.includes("Incorrect integer value") && (msg.includes("subject") || msg.includes("'[]'"))) {
        console.error("Error approving user selections (DB schema):", saveErr.message);
        return res.status(500).json({
          error: "Database columns users.subject and users.subject_title must be JSON type. Run: node scripts/alter-users-subject-to-json.js",
        });
      }
      throw saveErr;
    }

    // Send activation email (do not fail approval if email fails)
    try {
      await sendActivationStatusEmail(user.email, user.name, true);
    } catch (emailErr) {
      console.error("Activation email failed (user still approved):", emailErr.message);
    }

    res.status(200).json({
      message: "User selections approved and user activated successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        subject: subjectArray,
        subject_title: subjectTitleArray,
        is_verified: updatedUser.is_verified,
      },
    });
  } catch (err) {
    console.error("Error approving user selections:", err);
    res.status(500).json({ error: err.message });
  }
};

// Reject a single subject or subject-title request row.
// Route: POST /api/admin/subject-requests/:requestId/reject?type=subject|subject_title
exports.rejectSubjectRequest = async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId, 10);
    if (isNaN(requestId)) return res.status(400).json({ error: "Invalid request id" });

    const typeRaw = (req.query.type || "").toString().trim().toLowerCase();
    const type = typeRaw === "subject_title" ? "subject_title" : typeRaw === "subject" ? "subject" : null;
    if (!type) {
      return res.status(400).json({ error: "Missing/invalid query param: type=subject|subject_title" });
    }

    const adminId = req.user?.id || req.user?.user_id;
    const now = new Date();

    if (type === "subject") {
      const row = await UserSubject.findByPk(requestId);
      if (!row) return res.status(404).json({ error: "Subject request not found" });

      await row.update({ status: "rejected", approved_by: adminId, approved_at: now });
      await syncSubjectRowStatuses(row.user_id, row.subject_id, { approvedBy: adminId, now });
      await rebuildUserApprovedArrays(row.user_id);

      return res.status(200).json({ message: "Subject request rejected", request: row });
    }

    const row = await UserSubjectTitle.findByPk(requestId);
    if (!row) return res.status(404).json({ error: "Subject title request not found" });

    await row.update({ status: "rejected", approved_by: adminId, approved_at: now });
    await syncSubjectRowStatuses(row.user_id, row.subject_id, { approvedBy: adminId, now });
    await rebuildUserApprovedArrays(row.user_id);

    return res.status(200).json({ message: "Subject title request rejected", request: row });
  } catch (err) {
    console.error("Error rejecting subject request:", err);
    return res.status(500).json({ error: err.message });
  }
};

// Admin: remove approved subject/subject-title selections for a user (revoke)
exports.removeUserApprovedSelections = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const adminId = req.user?.id || req.user?.user_id;
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { user_subject_ids, user_subject_title_ids } = req.body || {};
    const toDeleteSubjectIds = Array.isArray(user_subject_ids)
      ? user_subject_ids.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id))
      : [];
    const toDeleteTitleIds = Array.isArray(user_subject_title_ids)
      ? user_subject_title_ids.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id))
      : [];

    if (toDeleteSubjectIds.length === 0 && toDeleteTitleIds.length === 0) {
      return res.status(400).json({
        error: "Provide at least one user_subject_ids or user_subject_title_ids (array of row ids).",
      });
    }

    const subjectIdsToSync = new Set();
    if (toDeleteSubjectIds.length > 0) {
      const subjectRows = await UserSubject.findAll({
        where: { user_id: userId, id: { [Op.in]: toDeleteSubjectIds } },
        attributes: ["subject_id"],
      });
      subjectRows.forEach((r) => subjectIdsToSync.add(r.subject_id));
    }
    if (toDeleteTitleIds.length > 0) {
      const titleRows = await UserSubjectTitle.findAll({
        where: { user_id: userId, id: { [Op.in]: toDeleteTitleIds } },
        attributes: ["subject_id"],
      });
      titleRows.forEach((r) => subjectIdsToSync.add(r.subject_id));
    }

    if (toDeleteSubjectIds.length > 0) {
      await UserSubject.destroy({
        where: {
          id: { [Op.in]: toDeleteSubjectIds },
          user_id: userId,
          status: "approved",
        },
      });
    }
    if (toDeleteTitleIds.length > 0) {
      await UserSubjectTitle.destroy({
        where: {
          id: { [Op.in]: toDeleteTitleIds },
          user_id: userId,
          status: "approved",
        },
      });
    }

    // Sync subject statuses from the remaining title rows.
    const now = new Date();
    for (const subjectId of subjectIdsToSync) {
      await syncSubjectRowStatuses(userId, subjectId, { approvedBy: adminId, now });
    }

    const [remainingSubjects, remainingTitles] = await Promise.all([
      UserSubject.findAll({ where: { user_id: userId, status: "approved" }, attributes: ["subject_id"] }),
      UserSubjectTitle.findAll({ where: { user_id: userId, status: "approved" }, attributes: ["subject_title_id"] }),
    ]);
    user.subject = remainingSubjects.map((s) => s.subject_id);
    user.subject_title = remainingTitles.map((st) => st.subject_title_id);
    await user.save();

    res.status(200).json({
      message: "Approved selection(s) removed successfully.",
      removed: { user_subject_ids: toDeleteSubjectIds, user_subject_title_ids: toDeleteTitleIds },
    });
  } catch (err) {
    console.error("Error removing user approved selections:", err);
    res.status(500).json({ error: err.message });
  }
};

// Activate user: always set is_verified = 1 (with or without pending selections).
exports.activateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const pendingSubjects = await UserSubject.count({
      where: { user_id: id, status: "pending" },
    });

    const pendingSubjectTitles = await UserSubjectTitle.count({
      where: { user_id: id, status: "pending" },
    });

    // Always activate: set is_verified = 1
    user.is_verified = 1;
    await user.save();
    await sendActivationStatusEmail(user.email, user.name, true);

    res.status(200).json({
      message: "User activated successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        subject: user.subject,
        subject_title: user.subject_title,
        is_verified: user.is_verified,
      },
      pending_selections_count: {
        subjects: pendingSubjects,
        subject_titles: pendingSubjectTitles,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deActivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Remove all subject and subject-title requests for this user
    await Promise.all([
      UserSubject.destroy({ where: { user_id: userId } }),
      UserSubjectTitle.destroy({ where: { user_id: userId } }),
    ]);

    // Clear approved selections stored on the user profile
    user.is_verified = 0;
    user.subject = [];
    user.subject_title = [];
    await user.save();

    await sendActivationStatusEmail(user.email, user.name, true);

    res.status(200).json({ message: "User deactivated successfully. All subject and subject-title requests have been removed.", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params; // Get user ID from request params

    const user = await User.findByPk(id); // Find user by primary key
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await user.destroy(); // Delete the user

    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all subject requests grouped by user
exports.getAllSubjectRequests = async (req, res) => {
  try {
    // Get all users
    const users = await User.findAll({
      where: { user_type: "user" },
      attributes: ["id", "name", "email", "phone_number", "username", "is_verified", "is_number_verified"],
    });

    // Get all subject and subject_title requests for all users
    const [allSubjects, allSubjectTitles] = await Promise.all([
      UserSubject.findAll({
        include: [
          { model: User, as: "user", attributes: ["id", "name", "email"] },
          { model: Subject, as: "subject", attributes: ["subject_id", "subject_name"] }
        ],
        order: [["created_at", "DESC"]],
      }),
      UserSubjectTitle.findAll({
        include: [
          { model: User, as: "user", attributes: ["id", "name", "email"] },
          { model: Subject, as: "subject", attributes: ["subject_id", "subject_name"] },
          { model: SubjectTitle, as: "subjectTitle", attributes: ["subject_title_id", "title_name"] }
        ],
        order: [["created_at", "DESC"]],
      }),
    ]);

    // Group requests by user
    const requestsByUser = users.map(user => {
      const userSubjects = allSubjects.filter(s => s.user_id === user.id);
      const userSubjectTitles = allSubjectTitles.filter(st => st.user_id === user.id);

      const subjectsPending = userSubjects.filter(s => s.status === "pending");
      const subjectsApproved = userSubjects.filter(s => s.status === "approved");
      const subjectsRejected = userSubjects.filter(s => s.status === "rejected");

      const titlesPending = userSubjectTitles.filter(st => st.status === "pending");
      const titlesApproved = userSubjectTitles.filter(st => st.status === "approved");
      const titlesRejected = userSubjectTitles.filter(st => st.status === "rejected");

      // Helper to build grouped requests per status
      const buildGrouped = (subjectRows, titleRows) => {
        const groups = [];
        const bySubjectId = new Map();

        // Ensure we include a group when only titles exist (no explicit subject row yet)
        titleRows.forEach(tr => {
          if (!bySubjectId.has(tr.subject_id)) {
            bySubjectId.set(tr.subject_id, {
              subject: {
                subject_id: tr.subject_id,
                subject_name: tr.subject?.subject_name || null,
              },
              subject_titles: [],
            });
            groups.push(bySubjectId.get(tr.subject_id));
          }
          bySubjectId.get(tr.subject_id).subject_titles.push({
            id: tr.id,
            user_subject_title_id: tr.id,
            subject_title_id: tr.subject_title_id,
            title_name: tr.subjectTitle?.title_name || null,
            status: tr.status,
            approved_by: tr.approved_by,
            approved_at: tr.approved_at,
            created_at: tr.created_at,
            updated_at: tr.updated_at,
          });
        });

        subjectRows.forEach(sr => {
          if (!bySubjectId.has(sr.subject_id)) {
            bySubjectId.set(sr.subject_id, {
              subject: {
                id: sr.id,
                user_subject_id: sr.id,
                subject_id: sr.subject_id,
                subject_name: sr.subject?.subject_name || null,
                status: sr.status,
                approved_by: sr.approved_by,
                approved_at: sr.approved_at,
                created_at: sr.created_at,
                updated_at: sr.updated_at,
              },
              subject_titles: [],
            });
            groups.push(bySubjectId.get(sr.subject_id));
          } else {
            // If we already have a group from titles-only, still preserve basic subject info
            const g = bySubjectId.get(sr.subject_id);
            g.subject = {
              id: sr.id,
              user_subject_id: sr.id,
              subject_id: sr.subject_id,
              subject_name: sr.subject?.subject_name || null,
              status: sr.status,
              approved_by: sr.approved_by,
              approved_at: sr.approved_at,
              created_at: sr.created_at,
              updated_at: sr.updated_at,
            };
          }
        });

        return groups;
      };

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone_number: user.phone_number,
          username: user.username,
          is_verified: user.is_verified,
          is_number_verified: user.is_number_verified,
        },
        requests: {
          subjects: {
            pending: subjectsPending.map(s => ({
              id: s.id,
              subject_id: s.subject_id,
              subject_name: s.subject?.subject_name || null,
              status: s.status,
              created_at: s.created_at,
              updated_at: s.updated_at,
            })),
            approved: subjectsApproved.map(s => ({
              id: s.id,
              user_subject_id: s.id,
              subject_id: s.subject_id,
              subject_name: s.subject?.subject_name || null,
              status: s.status,
              approved_by: s.approved_by,
              approved_at: s.approved_at,
              created_at: s.created_at,
              updated_at: s.updated_at,
            })),
            rejected: subjectsRejected.map(s => ({
              id: s.id,
              subject_id: s.subject_id,
              subject_name: s.subject?.subject_name || null,
              status: s.status,
              approved_by: s.approved_by,
              approved_at: s.approved_at,
              created_at: s.created_at,
              updated_at: s.updated_at,
            })),
            total: userSubjects.length,
          },
          subject_titles: {
            pending: titlesPending.map(st => ({
              id: st.id,
              subject_id: st.subject_id,
              subject_name: st.subject?.subject_name || null,
              subject_title_id: st.subject_title_id,
              title_name: st.subjectTitle?.title_name || null,
              status: st.status,
              created_at: st.created_at,
              updated_at: st.updated_at,
            })),
            approved: titlesApproved.map(st => ({
              id: st.id,
              user_subject_title_id: st.id,
              subject_id: st.subject_id,
              subject_name: st.subject?.subject_name || null,
              subject_title_id: st.subject_title_id,
              title_name: st.subjectTitle?.title_name || null,
              status: st.status,
              approved_by: st.approved_by,
              approved_at: st.approved_at,
              created_at: st.created_at,
              updated_at: st.updated_at,
            })),
            rejected: titlesRejected.map(st => ({
              id: st.id,
              subject_id: st.subject_id,
              subject_name: st.subject?.subject_name || null,
              subject_title_id: st.subject_title_id,
              title_name: st.subjectTitle?.title_name || null,
              status: st.status,
              approved_by: st.approved_by,
              approved_at: st.approved_at,
              created_at: st.created_at,
              updated_at: st.updated_at,
            })),
            total: userSubjectTitles.length,
          },
          // New: grouped requests useful for UI (Request #1 style)
          grouped: {
            pending: buildGrouped(subjectsPending, titlesPending),
            approved: buildGrouped(subjectsApproved, titlesApproved),
            rejected: buildGrouped(subjectsRejected, titlesRejected),
          },
        },
        summary: {
          total_subjects: userSubjects.length,
          total_subject_titles: userSubjectTitles.length,
          pending_subjects: subjectsPending.length,
          approved_subjects: subjectsApproved.length,
          rejected_subjects: subjectsRejected.length,
          pending_subject_titles: titlesPending.length,
          approved_subject_titles: titlesApproved.length,
          rejected_subject_titles: titlesRejected.length,
        }
      };
    });

    // Filter out users with no requests (optional - you can remove this if you want all users)
    const usersWithRequests = requestsByUser.filter(u => 
      u.requests.subjects.total > 0 || u.requests.subject_titles.total > 0
    );

    res.status(200).json({
      total_users: usersWithRequests.length,
      requests: usersWithRequests
    });
  } catch (err) {
    console.error("Error getting subject requests:", err);
    res.status(500).json({ error: err.message });
  }
};
