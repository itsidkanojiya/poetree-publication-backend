const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || "your_secret_key";

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Bearer token
  if (!token) {
    return res.status(403).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Unauthorized or invalid token" });
  }
};

module.exports = verifyToken;
