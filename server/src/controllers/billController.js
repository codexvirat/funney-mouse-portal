const asyncHandler = require('../utils/asyncHandler');
const Sale = require('../models/Sale');
const Customer = require('../models/Customer');
const Counter = require('../models/Counter');
const { dstr, addDays } = require('../utils/date');

async function nextBillNo(date) {
  const c = await Counter.findByIdAndUpdate(date, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return c.seq;
}

function computeTotals(items, discount, discountType) {
  const subtotal = items.reduce((a, i) => a + Number(i.amount || 0), 0);
  let disc = 0;
  if (discountType === 'pct') disc = Math.min(subtotal, Math.round(subtotal * (Number(discount) || 0) / 100));
  else disc = Math.min(subtotal, Number(discount) || 0);
  const total = Math.max(0, subtotal - disc);
  return { subtotal, discount: disc, total };
}

// Recompute every line amount server-side — never trust client-sent totals.
function cleanItems(items) {
  return items.map(i => {
    const qty = Number(i.qty) || 0, rate = Number(i.rate) || 0;
    return {
      cat: i.cat, refId: i.refId || null, name: i.name, qty, rate,
      amount: Math.round(qty * rate * 100) / 100,
      meta: i.meta || null
    };
  });
}

exports.createBill = asyncHandler(async (req, res) => {
  const { phone, name, items, discount, discountType, pay } = req.body;
  if (!Array.isArray(items) || !items.length) {
    res.status(400);
    throw new Error('Bill me items chahiye');
  }

  const itemsClean = cleanItems(items);
  const { subtotal, discount: disc, total } = computeTotals(itemsClean, discount, discountType);

  const payClean = {
    UPI: Number(pay && pay.UPI) || 0,
    CASH: Number(pay && pay.CASH) || 0,
    CARD: Number(pay && pay.CARD) || 0,
    DUE: Number(pay && pay.DUE) || 0
  };
  const paidSum = payClean.UPI + payClean.CASH + payClean.CARD + payClean.DUE;
  if (Math.round(paidSum) !== Math.round(total)) {
    res.status(400);
    throw new Error('Payment split total se match nahi karta');
  }

  const date = dstr();
  const no = await nextBillNo(date);
  const kids = itemsClean.filter(i => i.cat === 'play').reduce((a, i) => a + (i.meta && i.meta.kids || 0), 0);

  const bill = await Sale.create({
    date, no, ts: new Date().toISOString(),
    phone: phone || '', name: name || 'Walk-in',
    items: itemsClean, subtotal, discount: disc, total, pay: payClean, kids,
    staff: req.user.username, void: false
  });

  let customer = null;
  if (phone) {
    customer = await Customer.findOne({ phone });
    if (!customer) customer = new Customer({ phone, name: '', kid: '', visits: 0, totalSpend: 0, recent: [], membership: null });
    if (name) customer.name = name;
    customer.visits = (customer.visits || 0) + 1;
    customer.totalSpend = (customer.totalSpend || 0) + total;
    customer.lastVisit = date;
    customer.recent = [{ date, total, billId: String(bill._id) }].concat(customer.recent || []).slice(0, 8);

    const plan = itemsClean.find(i => i.cat === 'member');
    if (plan && plan.meta) {
      const old = customer.membership;
      const activeOld = !!(old && (!old.expiresAt || dstr() <= old.expiresAt) && !(old.hours > 0 && (old.hoursLeft || 0) <= 0));
      const stack = activeOld && old.planId === plan.refId;
      const planHours = Number(plan.meta.hours) || 0;
      const planDays = Number(plan.meta.days) || 0;
      const base = stack && old.expiresAt > date ? old.expiresAt : date;
      customer.membership = {
        planId: plan.refId,
        planName: plan.meta.planName,
        hours: planHours,
        hoursLeft: (stack && planHours > 0 ? (old.hoursLeft || 0) : 0) + planHours,
        startedAt: stack ? (old.startedAt || date) : date,
        expiresAt: addDays(base, planDays),
        renewals: stack ? (old.renewals || 0) + 1 : 0
      };
    }

    const used = itemsClean.filter(i => i.cat === 'play' && i.meta && i.meta.member);
    if (used.length && customer.membership && customer.membership.hours > 0) {
      const hrs = used.reduce((a, i) => a + (i.meta.minutes / 60) * i.meta.kids, 0);
      customer.membership.hoursLeft = Math.max(0, Math.round(((customer.membership.hoursLeft || 0) - hrs) * 100) / 100);
    }

    await customer.save();
  }

  res.status(201).json({ bill, customer });
});

exports.getBills = asyncHandler(async (req, res) => {
  const { date, month } = req.query;
  let bills;
  if (date) {
    bills = await Sale.find({ date }).sort('no');
  } else if (month) {
    const from = month + '-01', to = month + '-31';
    bills = await Sale.find({ date: { $gte: from, $lte: to } }).sort({ date: 1, no: 1 });
  } else {
    res.status(400);
    throw new Error('date ya month query chahiye');
  }
  res.json({ bills });
});

exports.voidBill = asyncHandler(async (req, res) => {
  const bill = await Sale.findById(req.params.id);
  if (!bill) {
    res.status(404);
    throw new Error('Bill not found');
  }
  if (bill.void) return res.json({ bill, warning: null });

  const { reason } = req.body;
  bill.void = true;
  bill.voidReason = reason || '';
  bill.voidAt = new Date().toISOString();
  await bill.save();

  let warning = null;
  if (bill.phone) {
    const customer = await Customer.findOne({ phone: bill.phone });
    if (customer) {
      customer.visits = Math.max(0, (customer.visits || 1) - 1);
      customer.totalSpend = Math.max(0, (customer.totalSpend || 0) - bill.total);
      customer.recent = (customer.recent || []).filter(r => r.billId !== String(bill._id));
      const sold = bill.items.find(i => i.cat === 'member');
      if (sold && customer.membership && customer.membership.startedAt === bill.date) {
        if ((customer.membership.renewals || 0) > 0) {
          warning = 'Ye renewal bill tha — member ka balance manually check kar lijiye.';
        } else {
          customer.membership = null;
        }
      }
      await customer.save();
    }
  }
  res.json({ bill, warning });
});

exports.settleDue = asyncHandler(async (req, res) => {
  const bill = await Sale.findById(req.params.id);
  if (!bill) {
    res.status(404);
    throw new Error('Bill not found');
  }
  const k = String(req.body.mode || '').trim().toUpperCase();
  if (!['UPI', 'CASH', 'CARD'].includes(k)) {
    res.status(400);
    throw new Error('UPI, CASH ya CARD likhein');
  }
  const due = bill.pay.DUE || 0;
  if (!due) return res.json({ bill });
  bill.pay.DUE = 0;
  bill.pay[k] = (bill.pay[k] || 0) + due;
  bill.dueSettledAt = new Date().toISOString();
  await bill.save();
  res.json({ bill });
});
