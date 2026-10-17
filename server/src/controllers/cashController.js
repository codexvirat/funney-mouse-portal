const asyncHandler = require('../utils/asyncHandler');
const CashDay = require('../models/CashDay');
const Expense = require('../models/Expense');
const Sale = require('../models/Sale');
const Booking = require('../models/Booking');
const { audit } = require('../utils/audit');
const { addDays } = require('../utils/date');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function checkDate(res, date) {
  if (!DATE_RE.test(date || '')) {
    res.status(400);
    throw new Error('Date galat hai');
  }
}

// What should be in the drawer at close: opening + cash bills + cash
// advances taken today on bookings − cash expenses. A booking's advance was
// already counted on the day it was taken (each date-wise party payment on
// its own date), so when the event-day bill puts that advance under CASH
// again it's taken back out here.
async function drawerSummary(date) {
  const start = new Date(date + 'T00:00:00'), end = new Date(addDays(date, 1) + 'T00:00:00');
  const [day, expenses, bills, bookings] = await Promise.all([
    CashDay.findById(date),
    Expense.find({ date }).sort('createdAt'),
    Sale.find({ date, void: false }),
    Booking.find({
      advance: { $gt: 0 }, status: { $ne: 'cancelled' },
      $or: [{ createdAt: { $gte: start, $lt: end } }, { 'party.payments.date': date }]
    })
  ]);
  const cashSales = bills.reduce((a, b) => a + ((b.pay && b.pay.CASH) || 0), 0);
  const advanceInBills = bills
    .filter(b => b.bookingId)
    .reduce((a, b) => a + (b.advanceByMode
      ? Number(b.advanceByMode.CASH) || 0
      : b.advanceMode === 'CASH' ? Math.min(b.advance || 0, (b.pay && b.pay.CASH) || 0) : 0), 0);
  const bookingAdvance = bookings.reduce((a, b) => {
    const list = b.party && b.party.payments;
    if (Array.isArray(list)) return a + list.filter(x => x.date === date && (x.mode || 'CASH') === 'CASH').reduce((s, x) => s + (Number(x.amount) || 0), 0);
    return a + (b.advanceMode === 'CASH' && b.createdAt >= start && b.createdAt < end ? b.advance : 0);
  }, 0);
  const cashExpenses = expenses.filter(e => e.mode === 'CASH').reduce((a, e) => a + e.amount, 0);
  const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0);
  const opening = day && day.opening != null ? day.opening : 0;
  const expected = opening + cashSales + bookingAdvance - advanceInBills - cashExpenses;
  const closing = day && day.closing != null ? day.closing : null;
  return {
    day: day || { _id: date, opening: null, closing: null, note: '' },
    expenses,
    summary: {
      opening, cashSales, bookingAdvance, advanceInBills, cashExpenses, totalExpenses, expected,
      closing, difference: closing == null ? null : closing - expected
    }
  };
}

exports.getDay = asyncHandler(async (req, res) => {
  checkDate(res, req.params.date);
  res.json(await drawerSummary(req.params.date));
});

exports.updateDay = asyncHandler(async (req, res) => {
  const { date } = req.params;
  checkDate(res, date);
  const { opening, closing, note } = req.body;
  const set = {};
  if (opening !== undefined) { set.opening = opening === null ? null : Math.max(0, Number(opening) || 0); set.openingBy = req.user.username; }
  if (closing !== undefined) { set.closing = closing === null ? null : Math.max(0, Number(closing) || 0); set.closingBy = req.user.username; }
  if (note !== undefined) set.note = String(note);
  await CashDay.findByIdAndUpdate(date, { $set: set }, { upsert: true });
  const out = await drawerSummary(date);
  if (closing !== undefined && closing !== null) {
    const d = out.summary.difference;
    await audit(req.user, 'Cash closed', `${date}: counted ₹${out.summary.closing}, expected ₹${out.summary.expected}${d ? ` (${d > 0 ? '+' : ''}${d})` : ''}`);
  }
  res.json(out);
});

exports.addExpense = asyncHandler(async (req, res) => {
  const { date } = req.params;
  checkDate(res, date);
  const { desc, amount, mode } = req.body;
  const amt = Number(amount) || 0;
  if (!desc || amt <= 0) {
    res.status(400);
    throw new Error('Kharche ka naam aur amount chahiye');
  }
  await Expense.create({
    date, desc: String(desc).slice(0, 120), amount: amt,
    mode: ['CASH', 'UPI', 'CARD'].includes(mode) ? mode : 'CASH',
    by: req.user.username
  });
  res.status(201).json(await drawerSummary(date));
});

exports.deleteExpense = asyncHandler(async (req, res) => {
  const e = await Expense.findByIdAndDelete(req.params.id);
  if (!e) {
    res.status(404);
    throw new Error('Expense not found');
  }
  await audit(req.user, 'Expense deleted', `${e.date}: ${e.desc} ₹${e.amount} (${e.mode}, added by ${e.by})`, e._id);
  res.json(await drawerSummary(e.date));
});

// Expenses over a period, for the reports' profit line.
exports.listExpenses = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  checkDate(res, from);
  checkDate(res, to);
  const expenses = await Expense.find({ date: { $gte: from, $lte: to } }).sort({ date: 1, createdAt: 1 });
  res.json({ expenses });
});
