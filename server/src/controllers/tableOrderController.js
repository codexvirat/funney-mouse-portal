const asyncHandler = require('../utils/asyncHandler');
const TableOrder = require('../models/TableOrder');
const Config = require('../models/Config');
const Booking = require('../models/Booking');
const Counter = require('../models/Counter');
const { dstr } = require('../utils/date');
const { pendingKot } = require('../utils/kot');
const { audit } = require('../utils/audit');
const { priceForMinutes } = require('../utils/pricing');
const { finalizeBill } = require('./billController');

exports.listTableOrders = asyncHandler(async (req, res) => {
  const orders = await TableOrder.find().sort('openedAt');
  res.json({ orders });
});

exports.openTable = asyncHandler(async (req, res) => {
  const { tableId, tableName, phone, name, adults, kids, reserved, reservedNote, waiterName, advance, advanceMode, bookingId } = req.body;
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
    waiterName: waiterName || '',
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
  const { phone, name, adults, kids, items, reserved, reservedNote, waiterName, advance, advanceMode } = req.body;
  if (phone !== undefined) order.phone = phone;
  if (name !== undefined) order.name = name;
  if (adults !== undefined) order.adults = Math.max(0, Number(adults) || 0);
  if (kids !== undefined) order.kids = Math.max(0, Number(kids) || 0);
  if (items !== undefined) order.items = items;
  if (reserved !== undefined) order.reserved = !!reserved;
  if (reservedNote !== undefined) order.reservedNote = reservedNote;
  if (waiterName !== undefined) order.waiterName = waiterName;
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
  await audit(req.user, order.reserved ? 'Reservation cancelled' : 'Table cancelled',
    `${order.tableName} · ${order.name || 'Walk-in'} · ${order.items.length} items (₹${value}) — no bill`, order._id);
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
  const mins = Math.max(5, Math.round((Date.now() - new Date(order.playStart).getTime()) / 60000));
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
  await order.save();
  res.json({ order });
});

exports.checkoutTable = asyncHandler(async (req, res) => {
  const order = await TableOrder.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Table order not found');
  }
  const { discount, discountType, pay, redeemPoints, kid, kidDob, anniversary } = req.body;
  const durationMins = Math.max(0, Math.round((Date.now() - new Date(order.openedAt).getTime()) / 60000));
  try {
    const { bill, customer } = await finalizeBill({
      phone: order.phone, name: order.name, kid, kidDob, anniversary, items: order.items,
      discount, discountType, pay, redeemPoints, staff: req.user.username,
      extra: {
        tableId: order.tableId, tableName: order.tableName, adults: order.adults,
        waiterName: order.waiterName, advance: order.advance, advanceMode: order.advanceMode,
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

