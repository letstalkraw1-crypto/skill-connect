const { getCache } = require('../utils/cache');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET not found in environment');
}
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { userId: payload.userId };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const optionalVerifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Use Redis cache for faster verification
    const user = await getCache(`user:${payload.userId}`);
    // If not in cache, we don't strictly NEED to check DB for optional auth
    // because the token is already verified by JWT.
    if (user || payload.userId) {
      req.user = { userId: payload.userId };
    }
  } catch {
    // Ignore invalid tokens for optional auth
  }
  next();
};

module.exports = { verifyToken, optionalVerifyToken };
