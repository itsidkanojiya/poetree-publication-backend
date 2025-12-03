const User = require("../models/User");
const express = require("express");
const { Op } = require("sequelize");
const moment = require("moment");
const { Subject, SubjectTitle } = require("../models/Subjects");
const UserSubject = require("../models/UserSubject");
const UserSubjectTitle = require("../models/UserSubjectTitle");
const { sendActivationStatusEmail } = require("../utils/sendOTPEmail.js");


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

// Approve user selections and activate user
exports.approveUserSelections = async (req, res) => {
  try {
    const { id } = req.params; // user_id
    const { 
      subject_ids = [],      // Array of user_subjects.id to approve
      subject_title_ids = [], // Array of user_subject_titles.id to approve
      reject_others = false  // If true, reject all non-approved items
    } = req.body;

    const adminId = req.user?.id || req.user?.user_id; // Admin ID from middleware

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const now = new Date();

    // Approve selected subjects
    if (subject_ids.length > 0) {
      await UserSubject.update(
        {
          status: "approved",
          approved_by: adminId,
          approved_at: now,
        },
        {
          where: {
            id: { [Op.in]: subject_ids },
            user_id: id,
          },
        }
      );

      // Reject others if requested
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
              id: { [Op.notIn]: subject_ids },
              status: "pending",
            },
          }
        );
      }
    }

    // Approve selected subject titles
    if (subject_title_ids.length > 0) {
      await UserSubjectTitle.update(
        {
          status: "approved",
          approved_by: adminId,
          approved_at: now,
        },
        {
          where: {
            id: { [Op.in]: subject_title_ids },
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
              id: { [Op.notIn]: subject_title_ids },
              status: "pending",
            },
          }
        );
      }
    }

    // Get all approved selections
    const approvedSubjects = await UserSubject.findAll({
      where: { user_id: id, status: "approved" },
      attributes: ["subject_id"],
    });

    const approvedSubjectTitles = await UserSubjectTitle.findAll({
      where: { user_id: id, status: "approved" },
      attributes: ["subject_title_id"],
    });

    // Update users table with approved values (as JSON arrays)
    const subjectArray = approvedSubjects.map(s => s.subject_id);
    const subjectTitleArray = approvedSubjectTitles.map(st => st.subject_title_id);

    // Convert to JSON strings for MySQL JSON storage
    user.subject = JSON.stringify(subjectArray);
    user.subject_title = JSON.stringify(subjectTitleArray);
    user.is_verified = 1; // Activate user
    await user.save();

    // Send activation email
    await sendActivationStatusEmail(user.email, user.name, true);

    res.status(200).json({
      message: "User selections approved and user activated successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        subject: subjectArray,
        subject_title: subjectTitleArray,
        is_verified: user.is_verified,
      },
    });
  } catch (err) {
    console.error("Error approving user selections:", err);
    res.status(500).json({ error: err.message });
  }
};

// Old activateUser - kept for backward compatibility but now just shows pending selections
exports.activateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get pending selections
    const pendingSubjects = await UserSubject.count({
      where: { user_id: id, status: "pending" },
    });

    const pendingSubjectTitles = await UserSubjectTitle.count({
      where: { user_id: id, status: "pending" },
    });

    res.status(200).json({
      message: "User details with pending selections",
      user: {
        ...user.toJSON(),
        password: undefined,
        otp: undefined,
      },
      pending_selections_count: {
        subjects: pendingSubjects,
        subject_titles: pendingSubjectTitles,
      },
      note: "Use /admin/approve-selections/:id to approve and activate user",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deActivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.is_verified = 0;
    await user.save();

await sendActivationStatusEmail(user.email, user.name, true);

    res.status(200).json({ message: "User deactivated successfully", user });
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
            pending: userSubjects.filter(s => s.status === "pending").map(s => ({
              id: s.id,
              subject_id: s.subject_id,
              subject_name: s.subject?.subject_name || null,
              status: s.status,
              created_at: s.created_at,
              updated_at: s.updated_at,
            })),
            approved: userSubjects.filter(s => s.status === "approved").map(s => ({
              id: s.id,
              subject_id: s.subject_id,
              subject_name: s.subject?.subject_name || null,
              status: s.status,
              approved_by: s.approved_by,
              approved_at: s.approved_at,
              created_at: s.created_at,
              updated_at: s.updated_at,
            })),
            rejected: userSubjects.filter(s => s.status === "rejected").map(s => ({
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
            pending: userSubjectTitles.filter(st => st.status === "pending").map(st => ({
              id: st.id,
              subject_id: st.subject_id,
              subject_name: st.subject?.subject_name || null,
              subject_title_id: st.subject_title_id,
              title_name: st.subjectTitle?.title_name || null,
              status: st.status,
              created_at: st.created_at,
              updated_at: st.updated_at,
            })),
            approved: userSubjectTitles.filter(st => st.status === "approved").map(st => ({
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
            rejected: userSubjectTitles.filter(st => st.status === "rejected").map(st => ({
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
        },
        summary: {
          total_subjects: userSubjects.length,
          total_subject_titles: userSubjectTitles.length,
          pending_subjects: userSubjects.filter(s => s.status === "pending").length,
          approved_subjects: userSubjects.filter(s => s.status === "approved").length,
          rejected_subjects: userSubjects.filter(s => s.status === "rejected").length,
          pending_subject_titles: userSubjectTitles.filter(st => st.status === "pending").length,
          approved_subject_titles: userSubjectTitles.filter(st => st.status === "approved").length,
          rejected_subject_titles: userSubjectTitles.filter(st => st.status === "rejected").length,
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
