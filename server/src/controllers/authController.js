const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const { audit } = require('../utils/audit');

function signToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '12h'
  });
}

function publicUser(u) {
  return { id: u._id, username: u.username, name: u.name, role: u.role };
}

function normalizeRole(role) {
  return ['admin', 'owner', 'kitchen', 'captain'].includes(role) ? role : 'staff';
}

exports.login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400);
    throw new Error('Username aur password dono chahiye');
  }
  const user = await User.findOne({ username: String(username).trim().toLowerCase() });
  if (!user || !user.active || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Galat username ya password');
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// Owner reports portal: PIN-only login, no username needed. Checks the PIN
// against every active 'owner' account (there's normally just one).
exports.ownerLogin = asyncHandler(async (req, res) => {
  const { pin } = req.body;
  if (!pin) {
    res.status(400);
    throw new Error('PIN chahiye');
  }
  const owners = await User.find({ role: 'owner', active: true });
  for (const owner of owners) {
    if (await owner.comparePassword(pin)) {
      return res.json({ token: signToken(owner), user: publicUser(owner) });
    }
  }
  res.status(401);
  throw new Error('Galat PIN');
});

// Captains (waiters with their own login) that a table can be assigned to.
exports.listCaptains = asyncHandler(async (req, res) => {
  const users = await User.find({ role: 'captain', active: true }).select('username name').sort('name');
  res.json({ captains: users.map(u => ({ username: u.username, name: u.name || u.username })) });
});

exports.listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-passwordHash').sort('username');
  res.json({ users });
});

exports.createUser = asyncHandler(async (req, res) => {
  const { username, password, name, role } = req.body;
  if (!username || !password) {
    res.status(400);
    throw new Error('Username aur password chahiye');
  }
  const uname = String(username).trim().toLowerCase();
  const exists = await User.findOne({ username: uname });
  if (exists) {
    res.status(409);
    throw new Error('Ye username pehle se hai');
  }
  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    username: uname,
    passwordHash,
    name: name || '',
    role: normalizeRole(role)
  });
  await audit(req.user, 'User added', `${user.username} (${user.role})`);
  res.status(201).json({ user: publicUser(user) });
});

exports.updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  const { name, role, active, password } = req.body;
  if (name !== undefined) user.name = name;
  if (role !== undefined) user.role = normalizeRole(role);
  if (active !== undefined) user.active = !!active;
  if (password) user.passwordHash = await User.hashPassword(password);
  await user.save();
  const what = [role !== undefined && 'role ' + user.role, active !== undefined && (user.active ? 'enabled' : 'disabled'), password && 'password reset', name !== undefined && 'name'].filter(Boolean).join(', ');
  await audit(req.user, 'User changed', `${user.username}: ${what}`);
  res.json({ user: publicUser(user) });
});

exports.deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    res.status(400);
    throw new Error('Khud ko delete nahi kar sakte');
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  await audit(req.user, 'User deleted', user.username);
  res.json({ ok: true });
});
