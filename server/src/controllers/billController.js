const asyncHandler = require('../utils/asyncHandler');
const Sale = require('../models/Sale');
const Customer = require('../models/Customer');
const Counter = require('../models/Counter');
const Config = require('../models/Config');
const { dstr, addDays } = require('../utils/date');
const { memberActive } = require('../utils/member');
const { inTimeWindow, nowHHMM } = require('../utils/time');

async function nextBillNo(date) {
  const c = await Counter.findByIdAndUpdate(date, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return c.seq;
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

// manualDiscount is what the staff typed in; memberDiscountAmt/happyHourAmt
// are auto-applied amounts (already computed upstream on the food+play
// subtotal). All three stack, capped so together they never exceed the bill
// subtotal.
function computeTotals(items, manualDiscount, discountType, memberDiscountAmt, happyHourAmt) {
  const subtotal = items.reduce((a, i) => a + Number(i.amount || 0), 0);
  let manual = discountType === 'pct'
    ? Math.round(subtotal * (Number(manualDiscount) || 0) / 100)
    : Number(manualDiscount) || 0;
  manual = Math.max(0, manual);
  const memberDiscount = Math.max(0, Math.min(subtotal, Number(memberDiscountAmt) || 0));
  const happyHourDiscount = Math.max(0, Math.min(subtotal, Number(happyHourAmt) || 0));
  const discount = Math.min(subtotal, manual + memberDiscount + happyHourDiscount);
  const total = Math.max(0, subtotal - discount);
  return { subtotal, discount, memberDiscount, happyHourDiscount, total };
}

// Auto-discounts (membership %, happy hour) depend only on the item list and
// customer/config state — computed here so the /preview endpoint and the
// real checkout always agree on the same numbers.
async function computeAutoDiscounts(itemsClean, customer) {
  const eligible = itemsClean.filter(i => i.cat === 'food' || i.cat === 'play').reduce((a, i) => a + i.amount, 0);
  const cfg = await Config.findOne();

  let memberDiscountAmt = 0;
  if (customer && memberActive(customer) && cfg) {
    const plan = (cfg.plans || []).find(p => p.id === customer.membership.planId);
    const pct = (plan && Number(plan.discountPercent) > 0) ? Number(plan.discountPercent) : (Number(cfg.memberDiscountPercent) || 0);
    const minSpend = Number(cfg.memberDiscountMinSpend) || 0;
    if (pct > 0 && eligible >= minSpend) {
      memberDiscountAmt = Math.round(eligible * pct / 100);
    }
  }

  let happyHourAmt = 0;
  if (cfg && cfg.happyHour && cfg.happyHour.enabled && Number(cfg.happyHour.discountPercent) > 0) {
    if (inTimeWindow(nowHHMM(), cfg.happyHour.start, cfg.happyHour.end)) {
      happyHourAmt = Math.round(eligible * Number(cfg.happyHour.discountPercent) / 100);
    }
  }

  return { memberDiscountAmt, happyHourAmt };
}

// Shared by the quick-bill flow (createBill) and the table checkout flow —
// turns a set of items + discount + payment split into a saved Sale and
// updates the attached Customer (visits/spend/membership).
async function finalizeBill({ phone, name, items, discount, discountType, pay, staff, extra }) {
  if (!Array.isArray(items) || !items.length) {
    const err = new Error('Bill me items chahiye');
    err.status = 400;
    throw err;
  }

  const itemsClean = cleanItems(items);

  let customer = null;
  if (phone) {
    customer = await Customer.findOne({ phone });
    if (!customer) customer = new Customer({ phone, name: '', kid: '', visits: 0, totalSpend: 0, recent: [], membership: null });
    if (name) customer.name = name;
  }

  const { memberDiscountAmt, happyHourAmt } = await computeAutoDiscounts(itemsClean, customer);

  const { subtotal, discount: disc, memberDiscount, happyHourDiscount, total } = computeTotals(itemsClean, discount, discountType, memberDiscountAmt, happyHourAmt);

  const payClean = {
    UPI: Number(pay && pay.UPI) || 0,
    CASH: Number(pay && pay.CASH) || 0,
    CARD: Number(pay && pay.CARD) || 0,
    DUE: Number(pay && pay.DUE) || 0
  };
  const paidSum = payClean.UPI + payClean.CASH + payClean.CARD + payClean.DUE;
  if (Math.round(paidSum) !== Math.round(total)) {
    const err = new Error('Payment split total se match nahi karta');
    err.status = 400;
    throw err;
  }

  const date = dstr();
  const no = await nextBillNo(date);
  const kids = itemsClean.filter(i => i.cat === 'play').reduce((a, i) => a + (i.meta && i.meta.kids || 0), 0);

  const bill = await Sale.create({
    date, no, ts: new Date().toISOString(),
    phone: phone || '', name: name || 'Walk-in',
    items: itemsClean, subtotal, discount: disc, memberDiscount, happyHourDiscount, total, pay: payClean, kids,
    staff, void: false,
    ...(extra || {})
  });

  if (customer) {
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

  return { bill, customer };
}

exports.finalizeBill = finalizeBill;

// Lets the client show the real amount due (member/happy-hour auto-discounts
// included) before payment, so what staff collects matches what checkout
// will actually charge — checkout still recomputes and validates itself.
exports.previewDiscount = asyncHandler(async (req, res) => {
  const { phone, items } = req.body;
  const itemsClean = cleanItems(Array.isArray(items) ? items : []);
  const subtotal = itemsClean.reduce((a, i) => a + i.amount, 0);
  const customer = phone ? await Customer.findOne({ phone }) : null;
  const { memberDiscountAmt, happyHourAmt } = await computeAutoDiscounts(itemsClean, customer);
  res.json({ subtotal, memberDiscount: memberDiscountAmt, happyHourDiscount: happyHourAmt });
});

exports.createBill = asyncHandler(async (req, res) => {
  const { phone, name, items, discount, discountType, pay } = req.body;
  try {
    const { bill, customer } = await finalizeBill({ phone, name, items, discount, discountType, pay, staff: req.user.username });
    res.status(201).json({ bill, customer });
  } catch (e) {
    res.status(e.status || 500);
    throw e;
  }
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
