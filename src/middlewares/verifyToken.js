const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || "default_secret"; // Must match token generation secret

const verifyToken = (req, res, next) => {
  // Support both 'authorization' and 'Authorization' header (case-insensitive)
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  
  console.log('[verifyToken] Headers received:', {
    authorization: req.headers['authorization'] ? 'present' : 'missing',
    Authorization: req.headers['Authorization'] ? 'present' : 'missing',
    url: req.originalUrl
  });
  
  if (!authHeader) {
    console.log('[verifyToken] No authorization header found');
    return res.status(403).json({ message: "No token provided" });
  }

  // Extract token (handle both "Bearer token" and just "token")
  let token;
  if (authHeader.startsWith('Bearer ') || authHeader.startsWith('bearer ')) {
    token = authHeader.split(' ')[1];
    console.log('[verifyToken] Token extracted from Bearer header, length:', token?.length);
  } else {
    token = authHeader; // In case token is sent without "Bearer" prefix
    console.log('[verifyToken] Token used directly (no Bearer prefix), length:', token?.length);
  }

  if (!token) {
    console.log('[verifyToken] Token is empty after extraction');
    return res.status(403).json({ message: "No token provided" });
  }

  console.log('[verifyToken] Using SECRET_KEY:', SECRET_KEY === process.env.JWT_SECRET ? 'from env' : 'default');
  console.log('[verifyToken] Token first 20 chars:', token.substring(0, 20) + '...');

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    console.log('[verifyToken] Token verified successfully, user ID:', decoded.id);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('[verifyToken] Token verification failed:', {
      error: err.name,
      message: err.message,
      tokenLength: token.length,
      secretKey: SECRET_KEY === process.env.JWT_SECRET ? 'from env' : 'default'
    });
    
    // Provide more specific error messages
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: "Token has expired. Please login again.",
        error: "TOKEN_EXPIRED",
        expiredAt: err.expiredAt
      });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: "Invalid token format.",
        error: "INVALID_TOKEN",
        details: err.message
      });
    }
    if (err.name === 'NotBeforeError') {
      return res.status(401).json({ 
        message: "Token not active yet.",
        error: "TOKEN_NOT_ACTIVE",
        date: err.date
      });
    }
    
    res.status(401).json({ 
      message: "Unauthorized or invalid token",
      error: "TOKEN_ERROR",
      errorType: err.name,
      details: err.message
    });
  }
};

module.exports = verifyToken;
