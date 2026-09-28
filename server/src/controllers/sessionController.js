const asyncHandler = require('../utils/asyncHandler');
const Session = require('../models/Session');

exports.listSessions = asyncHandler(async (req, res) => {
  const sessions = await Session.find().sort('start');
  res.json({ sessions });
});

exports.startSession = asyncHandler(async (req, res) => {
  const { kids, phone, name, member, plannedMins } = req.body;
  const session = await Session.create({
    start: new Date().toISOString(),
    kids: Math.max(1, Number(kids) || 1),
    phone: phone || '',
    name: name || 'Walk-in',
    member: !!member,
    plannedMins: Math.max(0, Number(plannedMins) || 0)
  });
  res.status(201).json({ session });
});

exports.endSession = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) {
    res.status(404);
    throw new Error('Session not found');
  }
  await Session.findByIdAndDelete(req.params.id);
  res.json({ session });
});

// Kid stepped out mid-play — freeze the timer so the gap isn't charged.
exports.pauseSession = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) {
    res.status(404);
    throw new Error('Session not found');
  }
  if (!session.pausedAt) {
    session.pausedAt = new Date().toISOString();
    await session.save();
  }
  res.json({ session });
});

exports.resumeSession = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) {
    res.status(404);
    throw new Error('Session not found');
  }
  if (session.pausedAt) {
    session.pausedMs = (session.pausedMs || 0) + Math.max(0, Date.now() - new Date(session.pausedAt).getTime());
    session.pausedAt = null;
    await session.save();
  }
  res.json({ session });
});
