const asyncHandler = require('../utils/asyncHandler');
const Session = require('../models/Session');

exports.listSessions = asyncHandler(async (req, res) => {
  const sessions = await Session.find().sort('start');
  res.json({ sessions });
});

exports.startSession = asyncHandler(async (req, res) => {
  const { kids, phone, name, member } = req.body;
  const session = await Session.create({
    start: new Date().toISOString(),
    kids: Math.max(1, Number(kids) || 1),
    phone: phone || '',
    name: name || 'Walk-in',
    member: !!member
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
