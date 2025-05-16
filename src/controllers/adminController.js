const User = require("../models/User");
const express = require("express");
const { Op } = require("sequelize");
const moment = require("moment");
const { Subject, SubjectTitle } = require("../models/Subjects");
const { sendActivationStatusEmail } = require("../utils/sendOTPEmail.js");


exports.getAllUser = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { user_type: "user" },
    });

    // Fetch subject and subject title for each user manually
    const formattedUsers = await Promise.all(
      users.map(async (user) => {
        // Fetch subject
        const subjectData = await Subject.findOne({
          where: { subject_id: user.subject },                                                                           
          attributes: ["subject_name"],
        });
        // Fetch subject title
        const subjectTitleData = await SubjectTitle.findOne({
          where: { subject_title_id: user.subject_title },
          attributes: ["title_name"],
        });

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
          subject: subjectData ? subjectData.subject_name : null,
          subject_title: subjectTitleData ? subjectTitleData.title_name : null,
          standard: user.standard,
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
exports.activateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.is_verified = 1;
    await user.save();

await sendActivationStatusEmail(user.email, user.name, true);

    res.status(200).json({ message: "User activated successfully", user });
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
