const asyncHandler = require('../utils/asyncHandler');
const TableOrder = require('../models/TableOrder');
const Config = require('../models/Config');
const Booking = require('../models/Booking');
const Counter = require('../models/Counter');
const { dstr } = require('../utils/date');
const { pendingKot } = require('../utils/kot');
const { audit } = require('../utils/audit');
const { priceForMinutes, playElapsedMins } = require('../utils/pricing');
const { finalizeBill } = require('./billController');

exports.listTableOrders = asyncHandler(async (req, res) => {
  const orders = await TableOrder.find().sort('openedAt');
  res.json({ orders });
});

exports.openTable = asyncHandler(async (req, res) => {
  const { tableId, tableName, phone, name, adults, kids, reserved, reservedNote, advance, advanceMode, bookingId } = req.body;
  if (!tableId) {
    res.status(400);
    throw new Error('Table select karein');
  }
  const existing = await TableOrder.findOne({ tableId });
  if (existing) {
    res.status(409);
    throw new Error('Ye table pehle se occupied hai');
  }
  const order = await TableOrder.create({
    tableId, tableName: tableName || '',
    phone: phone || '', name: name || 'Walk-in',
    adults: Math.max(0, Number(adults) || 0),
    kids: Math.max(0, Number(kids) || 0),
    items: [],
    reserved: !!reserved,
    reservedNote: reservedNote || '',
    advance: Math.max(0, Number(advance) || 0),
    advanceMode: advance ? (advanceMode || 'CASH') : '',
    bookingId: bookingId || '',
    openedAt: new Date().toISOString(),
    openedBy: req.user.username
  });
  if (bookingId) {
    await Booking.findByIdAndUpdate(bookingId, { status: 'used', usedTableId: tableId, usedTableIds: [tableId] });
  }
  res.status(201).json({ order });
});

exports.updateTableOrder = asyncHandler(async (req, res) => {
  const order = await TableOrder.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Table order not found');
  }
  const { phone, name, adults, kids, items, reserved, reservedNote, advance, advanceMode } = req.body;
  if (phone !== undefined) order.phone = phone;
  if (name !== undefined) order.name = name;
  if (adults !== undefined) order.adults = Math.max(0, Number(adults) || 0);
  if (kids !== undefined) order.kids = Math.max(0, Number(kids) || 0);
  if (items !== undefined) order.items = items;
  if (reserved !== undefined) order.reserved = !!reserved;
  if (reservedNote !== undefined) order.reservedNote = reservedNote;
  if (advance !== undefined) order.advance = Math.max(0, Number(advance) || 0);
  if (advanceMode !== undefined) order.advanceMode = advanceMode;
  await order.save();
  res.json({ order });
});

exports.cancelTableOrder = asyncHandler(async (req, res) => {
  const order = await TableOrder.findByIdAndDelete(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Table order not found');
  }
  const value = order.items.reduce((a, i) => a + (i.amount || 0), 0);
  const split = (order.paidBills || []).length ? ` · ${order.paidBills.length} split bill(s) pehle ban chuke` : '';
  await audit(req.user, order.reserved ? 'Reservation cancelled' : 'Table cancelled',
    `${order.tableName} · ${order.name || 'Walk-in'} · ${order.items.length} items (₹${value}) — no bill${split}`, order._id);
  res.json({ order });
});

exports.transferTable = asyncHandler(async (req, res) => {
  const order = await TableOrder.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Table order not found');
  }
  const { toTableId, toTableName } = req.body;
  if (!toTableId) {
    res.status(400);
    throw new Error('Target table select karein');
  }
  const busy = await TableOrder.findOne({ tableId: toTableId });
  if (busy) {
    res.status(409);
    throw new Error('Target table pehle se occupied hai');
  }
  order.tableId = toTableId;
  order.tableName = toTableName || order.tableName;
  await order.save();
  res.json({ order });
});

exports.mergeTable = asyncHandler(async (req, res) => {
  const order = await TableOrder.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Table order not found');
  }
  const { targetId } = req.body;
  if (!targetId) {
    res.status(400);
    throw new Error('Target table select karein');
  }
  const target = await TableOrder.findById(targetId);
  if (!target) {
    res.status(404);
    throw new Error('Target table order not found');
  }
  target.items = [...target.items, ...order.items];
  target.adults += order.adults;
  target.kids += order.kids;
  target.advance += order.advance;
  target.kots = [...target.kots, ...order.kots];
  target.requests = [...target.requests, ...order.requests];
  target.paidItems = [...(target.paidItems || []), ...(order.paidItems || [])];
  target.paidBills = [...(target.paidBills || []), ...(order.paidBills || [])];
  if (!target.phone && order.phone) { target.phone = order.phone; target.name = order.name; }
  await target.save();
  await TableOrder.findByIdAndDelete(order._id);
  res.json({ order: target });
});

exports.startPlay = asyncHandler(async (req, res) => {
  const order = await TableOrder.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Table order not found');
  }
  const { kids, member, plannedMins } = req.body;
  order.playStart = new Date().toISOString();
  order.playKids = Math.max(1, Number(kids) || order.kids || 1);
  order.playMember = !!member;
  order.playPlannedMins = Math.max(0, Number(plannedMins) || 0);
  order.playPausedAt = null;
  order.playPausedMs = 0;
  await order.save();
  res.json({ order });
});

exports.endPlay = asyncHandler(async (req, res) => {
  const order = await TableOrder.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Table order not found');
  }
  if (!order.playStart) {
    res.status(400);
    throw new Error('Koi timer chal nahi raha');
  }
  const cfg = await Config.findOne();
  const mins = Math.max(5, playElapsedMins(order.playStart, order.playPausedMs, order.playPausedAt));
  const member = order.playMember;
  const rate = member ? 0 : priceForMinutes(cfg || {}, mins);
  order.items.push({
    cat: 'play', refId: null, name: member ? 'Play (membership)' : 'Play area',
    qty: order.playKids, rate, amount: rate * order.playKids,
    meta: { minutes: mins, kids: order.playKids, member }
  });
  order.playStart = null;
  order.playKids = 0;
  order.playMember = false;
  order.playPlannedMins = 0;
  order.playPausedAt = null;
  order.playPausedMs = 0;
  await order.save();
  res.json({ order });
});

// Kid stepped out mid-play — freeze the table's play timer, then resume.
exports.pausePlay = asyncHandler(async (req, res) => {
  const order = await TableOrder.findById(req.params.id);
  if (!order || !order.playStart) {
    res.status(400);
    throw new Error('Koi timer chal nahi raha');
  }
  if (!order.playPausedAt) {
    order.playPausedAt = new Date().toISOString();
    await order.save();
  }
  res.json({ order });
});

exports.resumePlay = asyncHandler(async (req, res) => {
  const order = await TableOrder.findById(req.params.id);
  if (!order || !order.playStart) {
    res.status(400);
    throw new Error('Koi timer chal nahi raha');
  }
  if (order.playPausedAt) {
    order.playPausedMs = (order.playPausedMs || 0) + Math.max(0, Date.now() - new Date(order.playPausedAt).getTime());
    order.playPausedAt = null;
    await order.save();
  }
  res.json({ order });
});

// How much of the table's advance this bill uses up: the advance was
// pre-filled into its own payment mode on the payment sheet, so whatever
// landed in that mode (up to the advance left) counts as advance.
function advanceFor(order, pay) {
  if (!(order.advance > 0)) return { advance: 0, advanceMode: '' };
  const mode = order.advanceMode || 'CASH';
  const used = Math.min(order.advance, Number(pay && pay[mode]) || 0);
  return { advance: used, advanceMode: used > 0 ? mode : '' };
}

// Split / separate bill: bill only the picked lines (e.g. just the play
// area, or what one guest of a group ate) and keep the rest on the table.
// picks = [{ index, qty, name }] against order.items as the client last saw
// them — name is re-checked so a stale screen can't bill the wrong line.
// Play/membership lines go whole (their qty is kids, tied to meta).
exports.checkoutPart = asyncHandler(async (req, res) => {
  const order = await TableOrder.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Table order not found');
  }
  const { picks, discount, discountType, pay, redeemPoints, phone, name, serviceCharge, serviceChargeType } = req.body;
  if (!Array.isArray(picks) || !picks.length) {
    res.status(400);
    throw new Error('Bill ke liye items select karein');
  }
  const take = new Map();
  for (const p of picks) {
    const ix = Number(p.index);
    const line = order.items[ix];
    const qty = Number(p.qty) || 0;
    if (!line || line.name !== p.name || qty <= 0 || qty > line.qty || take.has(ix)) {
      res.status(409);
      throw new Error('Table ka bill badal gaya hai — refresh karke dobara select karein');
    }
    const whole = !(line.cat === 'food' || line.cat === 'socks');
    take.set(ix, whole ? line.qty : qty);
  }

  const picked = [];
  const rest = [];
  order.items.forEach((line, ix) => {
    const obj = line.toObject ? line.toObject() : line;
    const q = take.get(ix) || 0;
    if (q > 0) picked.push({ ...obj, qty: q, amount: q * obj.rate });
    if (obj.qty - q > 0) rest.push({ ...obj, qty: obj.qty - q, amount: (obj.qty - q) * obj.rate });
  });

  const closes = !rest.length && !order.playStart;
  const durationMins = Math.max(0, Math.round((Date.now() - new Date(order.openedAt).getTime()) / 60000));
  const adv = advanceFor(order, pay);
  let result;
  try {
    result = await finalizeBill({
      phone: phone || '', name: name || 'Walk-in', items: picked,
      discount, discountType, pay, redeemPoints, serviceCharge, serviceChargeType, staff: req.user.username,
      extra: {
        tableId: order.tableId, tableName: order.tableName, adults: closes ? order.adults : 0,
        ...adv, durationMins, bookingId: order.bookingId || ''
      }
    });
  } catch (e) {
    res.status(e.status || 500);
    throw e;
  }
  const { bill, customer } = result;

  if (closes) {
    await TableOrder.findByIdAndDelete(order._id);
    return res.status(201).json({ bill, customer, order: null });
  }
  order.items = rest;
  order.paidItems = [...(order.paidItems || []), ...picked];
  order.paidBills = [...(order.paidBills || []), { id: String(bill._id), no: bill.no, total: bill.total, name: bill.name }];
  order.advance = Math.max(0, order.advance - adv.advance);
  if (!order.advance) order.advanceMode = '';
  await order.save();
  res.status(201).json({ bill, customer, order });
});

exports.checkoutTable = asyncHandler(async (req, res) => {
  const order = await TableOrder.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Table order not found');
  }
  const { discount, discountType, pay, redeemPoints, kid, kidDob, anniversary, serviceCharge, serviceChargeType } = req.body;
  const durationMins = Math.max(0, Math.round((Date.now() - new Date(order.openedAt).getTime()) / 60000));
  try {
    const { bill, customer } = await finalizeBill({
      phone: order.phone, name: order.name, kid, kidDob, anniversary, items: order.items,
      discount, discountType, pay, redeemPoints, serviceCharge, serviceChargeType, staff: req.user.username,
      extra: {
        tableId: order.tableId, tableName: order.tableName, adults: order.adults,
        ...advanceFor(order, pay),
        durationMins, bookingId: order.bookingId || ''
      }
    });
    await TableOrder.findByIdAndDelete(order._id);
    res.status(201).json({ bill, customer });
  } catch (e) {
    res.status(e.status || 500);
    throw e;
  }
});

// Print whatever food hasn't gone to the kitchen yet as one KOT. Used by both
// the kitchen login and the table's own "Print KOT" button. The push is
// guarded on the current kots length so two devices tapping at once can't
// both print the same items.
exports.sendKot = asyncHandler(async (req, res) => {
  const order = await TableOrder.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Table order not found');
  }
  const items = pendingKot(order);
  if (!items.length) {
    res.status(400);
    throw new Error('Kitchen ke liye koi naya food item nahi hai');
  }
  const c = await Counter.findByIdAndUpdate('kot-' + dstr(), { $inc: { seq: 1 } }, { new: true, upsert: true });
  const kot = { no: c.seq, at: new Date().toISOString(), by: req.user.username, items };
  // Tables opened before KOTs existed have no `kots` field at all, which $size won't match.
  const sameKots = order.kots.length
    ? { kots: { $size: order.kots.length } }
    : { $or: [{ kots: { $size: 0 } }, { kots: { $exists: false } }] };
  const updated = await TableOrder.findOneAndUpdate(
    { _id: order._id, ...sameKots },
    { $push: { kots: kot } },
    { new: true }
  );
  if (!updated) {
    res.status(409);
    throw new Error('Ye KOT abhi kisi aur ne print kar diya — refresh karein');
  }
  res.status(201).json({ order: updated, kot });
});

// Kitchen marks a printed KOT as cooked; the floor screen then shows
// "food ready" on that table until staff mark it served.
function kotStamp(field) {
  return asyncHandler(async (req, res) => {
    const no = Number(req.params.no);
    const order = await TableOrder.findOneAndUpdate(
      { _id: req.params.id, 'kots.no': no },
      { $set: { ['kots.$.' + field]: new Date().toISOString() } },
      { new: true }
    );
    if (!order) {
      res.status(404);
      throw new Error('KOT not found');
    }
    res.json({ order });
  });
}
exports.kotReady = kotStamp('readyAt');
exports.kotServed = kotStamp('servedAt');

// Accept or reject a QR order the customer placed from their table.
// Accepting copies its items onto the bill.
exports.handleRequest = asyncHandler(async (req, res) => {
  const order = await TableOrder.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Table order not found');
  }
  const r = order.requests.find(x => x.id === req.params.rid);
  if (!r || r.status !== 'new') {
    res.status(400);
    throw new Error('Ye order pehle hi handle ho chuka hai');
  }
  const accept = req.body.action === 'accept';
  r.status = accept ? 'accepted' : 'rejected';
  if (accept) {
    r.items.forEach(i => order.items.push({ ...(i.toObject ? i.toObject() : i), meta: { ...(i.meta || {}), qr: r.id } }));
  }
  order.markModified('requests');
  await order.save();
  res.json({ order });
});

