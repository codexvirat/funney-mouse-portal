const asyncHandler = require('../utils/asyncHandler');
const Inquiry = require('../models/Inquiry');
const { dstr } = require('../utils/date');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = ['new', 'followup', 'converted', 'lost'];

function clean(body) {
  const out = {};
  const str = (k, max = 200) => { if (body[k] !== undefined) out[k] = String(body[k] || '').slice(0, max); };
  const num = k => { if (body[k] !== undefined) out[k] = Math.max(0, Number(body[k]) || 0); };
  const date = k => { if (body[k] !== undefined) out[k] = DATE_RE.test(body[k]) ? body[k] : ''; };
  ['name', 'childName', 'packageInterest', 'source'].forEach(k => str(k));
  str('note', 1000);
  if (body.phone !== undefined) out.phone = String(body.phone || '').replace(/\D/g, '').slice(-10);
  ['kids', 'adults', 'budget'].forEach(num);
  ['inquiryDate', 'partyDate', 'followUpDate'].forEach(date);
  if (body.status !== undefined && STATUSES.includes(body.status)) out.status = body.status;
  if (body.bookingId !== undefined) out.bookingId = String(body.bookingId || '');
  return out;
}

// Newest enquiry date first; same day, latest entered first.
exports.listInquiries = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const q = status && status !== 'all'
    ? (status === 'open' ? { status: { $in: ['new', 'followup'] } } : { status })
    : {};
  const inquiries = await Inquiry.find(q).sort({ inquiryDate: -1, createdAt: -1 }).limit(1000);
  res.json({ inquiries });
});

exports.createInquiry = asyncHandler(async (req, res) => {
  const data = clean(req.body);
  if (!data.inquiryDate) data.inquiryDate = dstr();
  if (!data.name && !data.phone) {
    res.status(400);
    throw new Error('Naam ya mobile number chahiye');
  }
  const inquiry = await Inquiry.create({ ...data, createdBy: req.user.username });
  res.status(201).json({ inquiry });
});

exports.updateInquiry = asyncHandler(async (req, res) => {
  const inquiry = await Inquiry.findById(req.params.id);
  if (!inquiry) {
    res.status(404);
    throw new Error('Inquiry not found');
  }
  Object.assign(inquiry, clean(req.body));
  if (!inquiry.inquiryDate) inquiry.inquiryDate = dstr();
  await inquiry.save();
  res.json({ inquiry });
});

exports.deleteInquiry = asyncHandler(async (req, res) => {
  const inquiry = await Inquiry.findByIdAndDelete(req.params.id);
  if (!inquiry) {
    res.status(404);
    throw new Error('Inquiry not found');
  }
  res.json({ inquiry });
});
