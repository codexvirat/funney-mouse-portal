const asyncHandler = require('../utils/asyncHandler');
const Customer = require('../models/Customer');
const { dstr, addDays } = require('../utils/date');

exports.getByPhone = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ phone: req.params.phone });
  res.json({ customer: customer || null });
});

// Save name / child / child's birthday from the billing screen. Creates the
// record if this phone has never billed yet.
exports.updateCustomer = asyncHandler(async (req, res) => {
  const phone = String(req.params.phone || '');
  if (!/^\d{10}$/.test(phone)) {
    res.status(400);
    throw new Error('10 digit number chahiye');
  }
  const { name, kid, kidDob } = req.body;
  const set = {};
  if (name !== undefined) set.name = String(name);
  if (kid !== undefined) set.kid = String(kid);
  if (kidDob !== undefined) set.kidDob = /^\d{4}-\d{2}-\d{2}$/.test(kidDob) ? kidDob : '';
  const customer = await Customer.findOneAndUpdate({ phone }, { $set: set, $setOnInsert: { phone } }, { new: true, upsert: true });
  res.json({ customer });
});

// Kids whose birthday (month-day of kidDob) falls in the next `days` days.
exports.upcomingBirthdays = asyncHandler(async (req, res) => {
  const days = Math.min(60, Math.max(1, Number(req.query.days) || 7));
  const today = dstr();
  const upcoming = new Map();
  for (let i = 0; i < days; i++) {
    const d = addDays(today, i);
    upcoming.set(d.slice(5), { date: d, inDays: i });
  }
  const customers = await Customer.find({ kidDob: { $ne: '' } }).select('phone name kid kidDob visits lastVisit');
  const list = customers
    .map(c => {
      const hit = upcoming.get(c.kidDob.slice(5));
      if (!hit) return null;
      return { phone: c.phone, name: c.name, kid: c.kid, kidDob: c.kidDob, date: hit.date, inDays: hit.inDays, age: Number(hit.date.slice(0, 4)) - Number(c.kidDob.slice(0, 4)) };
    })
    .filter(Boolean)
    .sort((a, b) => a.inDays - b.inDays);
  res.json({ birthdays: list });
});
