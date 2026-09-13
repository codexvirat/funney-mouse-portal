const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
  const token = header.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    res.status(401);
    throw new Error('Not authorized, token invalid');
  }
  const user = await User.findById(decoded.id).select('-passwordHash');
  if (!user || !user.active) {
    res.status(401);
    throw new Error('Not authorized');
  }
  req.user = user;
  next();
});

function adminOnly(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  res.status(403);
  throw new Error('Admin access required');
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) return next();
    res.status(403);
    throw new Error('Access denied');
  };
}

module.exports = { protect, adminOnly, allowRoles };
