const User = require('../models/User');
exports.getAllUser = async (req, res) => {
    try {
        const users = await User.findAll({
            where: { user_type: 'user' }
        });
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getAllActivateUser = async (req, res) => {
    try {
        const users = await User.findAll({
            where: { user_type: 'user' ,is_verified : 1 }
        });
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getAllDeActivateUser = async (req, res) => {
    try {
        const users = await User.findAll({
            where: { user_type: 'user' ,is_verified : 0 }
        });
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.activateUser = async (req, res) => {
    try {
        const { id } = req.params; // Get user ID from request params

        const user = await User.findByPk(id); // Find user by primary key
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.is_verified = 1; // Update is_verified field
        await user.save(); // Save changes

        res.status(200).json({ message: 'User activated successfully', user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.deActivateUser = async (req, res) => {
    try {
        const { id } = req.params; // Get user ID from request params

        const user = await User.findByPk(id); // Find user by primary key
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.is_verified = 1; // Update is_verified field
        await user.save(); // Save changes

        res.status(200).json({ message: 'User deactivated successfully', user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params; // Get user ID from request params

        const user = await User.findByPk(id); // Find user by primary key
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await user.destroy(); // Delete the user

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
