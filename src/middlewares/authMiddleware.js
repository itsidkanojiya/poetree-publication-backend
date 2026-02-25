const jwt = require('jsonwebtoken');


exports.verifyAdmin = (req, res, next) => {
    // Support both 'Authorization' and 'authorization' header (case-insensitive)
    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || req.header('Authorization');
    const token = authHeader?.split(' ')[1]; // Extract token after "Bearer "
    if (!token) return res.status(401).json({ message: 'Access Denied' });

    try {
        const SECRET_KEY = process.env.JWT_SECRET || "default_secret"; // Must match token generation
        const verified = jwt.verify(token, SECRET_KEY);
        if (verified.user_type !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        req.user = verified;
        next();
    } catch (err) {
        console.error('Admin token verification error:', err.message);
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token has expired. Please login again.' });
        }
        res.status(400).json({ message: 'Invalid Token', error: err.message });
    }
};
