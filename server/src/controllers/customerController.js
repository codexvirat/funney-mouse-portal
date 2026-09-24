const asyncHandler = require('../utils/asyncHandler');
const Customer = require('../models/Customer');

exports.getByPhone = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ phone: req.params.phone });
  res.json({ customer: customer || null });
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Save name / child / child's birthday / anniversary from the billing
// screen. Creates the record if this phone has never billed yet.
exports.updateCustomer = asyncHandler(async (req, res) => {
  const phone = String(req.params.phone || '');
  if (!/^\d{10}$/.test(phone)) {
    res.status(400);
    throw new Error('10 digit number chahiye');
  }
  const { name, kid, kidDob, anniversary } = req.body;
  const set = {};
  if (name !== undefined) set.name = String(name);
  if (kid !== undefined) set.kid = String(kid);
  if (kidDob !== undefined) set.kidDob = DATE_RE.test(kidDob) ? kidDob : '';
  if (anniversary !== undefined) set.anniversary = DATE_RE.test(anniversary) ? anniversary : '';
  const customer = await Customer.findOneAndUpdate({ phone }, { $set: set, $setOnInsert: { phone } }, { new: true, upsert: true });
  res.json({ customer });
});

// Everyone with a child's birthday or an anniversary in the given month
// (MM, any year) — the calendar on the Customers page groups them by day.
exports.occasions = asyncHandler(async (req, res) => {
  const mm = String(req.query.month || '');
  if (!/^(0[1-9]|1[0-2])$/.test(mm)) {
    res.status(400);
    throw new Error('month (01-12) chahiye');
  }
  const inMonth = new RegExp('^\\d{4}-' + mm + '-');
  const customers = await Customer.find({ $or: [{ kidDob: inMonth }, { anniversary: inMonth }] })
    .select('phone name kid kidDob anniversary visits lastVisit');
  const out = [];
  customers.forEach(c => {
    if (inMonth.test(c.kidDob || '')) out.push({ type: 'birthday', day: c.kidDob.slice(8), since: c.kidDob, phone: c.phone, name: c.name, kid: c.kid });
    if (inMonth.test(c.anniversary || '')) out.push({ type: 'anniversary', day: c.anniversary.slice(8), since: c.anniversary, phone: c.phone, name: c.name, kid: c.kid });
  });
  out.sort((a, b) => a.day.localeCompare(b.day) || a.type.localeCompare(b.type));
  res.json({ occasions: out });
});
