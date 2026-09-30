const User = require('../models/User');

// Deleting (voiding) or editing a saved bill needs a reason plus the password
// of any active admin, so a counter mistake can be fixed but never silently.
// Returns the approving admin's username. Uses 403 (not 401) on a wrong
// password so the client doesn't treat it as an expired login.
async function requireApproval(req, res) {
  const reason = String((req.body && req.body.reason) || '').trim();
  const password = String((req.body && req.body.password) || '');
  if (!reason) {
    res.status(400);
    throw new Error('Reason likhna zaroori hai');
  }
  if (!password) {
    res.status(400);
    throw new Error('Password chahiye');
  }
  const admins = await User.find({ role: 'admin', active: true });
  for (const a of admins) {
    if (await a.comparePassword(password)) return { reason, approvedBy: a.username };
  }
  res.status(403);
  throw new Error('Galat password');
}

module.exports = { requireApproval };
