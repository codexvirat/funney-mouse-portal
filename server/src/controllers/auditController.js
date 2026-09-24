const asyncHandler = require('../utils/asyncHandler');
const AuditLog = require('../models/AuditLog');

exports.listAudit = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) {
    res.status(400);
    throw new Error('from/to date chahiye');
  }
  const logs = await AuditLog.find({ date: { $gte: from, $lte: to } }).sort({ at: -1 }).limit(1000);
  res.json({ logs });
});
