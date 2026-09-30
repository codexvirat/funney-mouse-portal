const asyncHandler = require('../utils/asyncHandler');
const Booking = require('../models/Booking');
const TableOrder = require('../models/TableOrder');
const Config = require('../models/Config');
const { audit } = require('../utils/audit');
const { dstr } = require('../utils/date');
const { finalizeBill } = require('./billController');

exports.listBookings = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const q = status ? { status } : {};
  const bookings = await Booking.find(q).sort('eventDate');
  res.json({ bookings });
});

exports.createBooking = asyncHandler(async (req, res) => {
  const { phone, name, eventDate, guests, tablesCount, advance, advanceMode, note, estimate, party } = req.body;
  if (!eventDate) {
    res.status(400);
    throw new Error('Event ki date chahiye');
  }
  const booking = await Booking.create({
    phone: phone || '', name: name || 'Walk-in', eventDate,
    guests: Math.max(0, Number(guests) || 0),
    tablesCount: Math.max(1, Number(tablesCount) || 1),
    advance: Math.max(0, Number(advance) || 0),
    advanceMode: advanceMode || 'CASH',
    estimate: Math.max(0, Number(estimate) || 0),
    note: note || '',
    party: party && typeof party === 'object' ? party : null,
    createdBy: req.user.username
  });
  res.status(201).json({ booking });
});

exports.updateBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  const { phone, name, eventDate, guests, tablesCount, advance, advanceMode, note, status, estimate, party } = req.body;
  if (phone !== undefined) booking.phone = phone;
  if (name !== undefined) booking.name = name;
  if (eventDate !== undefined) booking.eventDate = eventDate;
  if (guests !== undefined) booking.guests = Math.max(0, Number(guests) || 0);
  if (tablesCount !== undefined) booking.tablesCount = Math.max(1, Number(tablesCount) || 1);
  if (advance !== undefined) booking.advance = Math.max(0, Number(advance) || 0);
  if (advanceMode !== undefined) booking.advanceMode = advanceMode;
  if (note !== undefined) booking.note = note;
  if (estimate !== undefined) booking.estimate = Math.max(0, Number(estimate) || 0);
  if (party !== undefined) {
    // Extras have their own endpoint; a form save never touches them.
    const extras = booking.party && booking.party.extras;
    booking.party = party && typeof party === 'object' ? { ...party, extras: extras || [] } : null;
    booking.markModified('party');
  }
  const cancelling = status === 'cancelled' && booking.status !== 'cancelled';
  if (status !== undefined) booking.status = status;
  await booking.save();
  if (cancelling) await audit(req.user, 'Booking cancelled', `${booking.name} · ${booking.eventDate} · advance ₹${booking.advance}`, booking._id);
  res.json({ booking });
});

exports.deleteBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findByIdAndDelete(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  await audit(req.user, 'Booking deleted', `${booking.name} · ${booking.eventDate} · advance ₹${booking.advance}`, booking._id);
  res.json({ booking });
});

// Grab `count` free tables for a party booking in one go (in Setup order),
// split the guests evenly across them, and put the whole advance on the
// first table so it's only credited once at checkout. The party's tables can
// be merged into one bill later with the normal Merge button.
exports.assignTables = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (booking.status !== 'pending') {
    res.status(400);
    throw new Error('Ye booking pehle hi use/cancel ho chuki hai');
  }
  if (booking.party) {
    res.status(400);
    throw new Error('Party booking ka bill Party booking tab se banta hai — table nahi khulti');
  }
  const count = Math.max(1, Number(req.body.count) || booking.tablesCount || 1);
  const reserveOnly = !!req.body.reserveOnly;
  const cfg = await Config.findOne();
  const busy = new Set((await TableOrder.find().select('tableId')).map(o => o.tableId));
  const free = ((cfg && cfg.tables) || []).filter(t => !busy.has(t.id));
  if (free.length < count) {
    res.status(409);
    throw new Error(`Sirf ${free.length} table free hai, ${count} chahiye`);
  }
  const picked = free.slice(0, count);

  let left = booking.guests || 0;
  const now = new Date().toISOString();
  const orders = [];
  for (let ix = 0; ix < picked.length; ix++) {
    const t = picked[ix];
    const seat = Math.ceil(left / (picked.length - ix));
    left -= seat;
    orders.push({
      tableId: t.id, tableName: t.name,
      phone: booking.phone, name: booking.name,
      adults: seat, kids: 0, items: [],
      reserved: reserveOnly,
      reservedNote: `Party booking (${ix + 1}/${picked.length})${booking.note ? ' · ' + booking.note : ''}`,
      advance: ix === 0 ? booking.advance : 0,
      advanceMode: ix === 0 && booking.advance ? booking.advanceMode : '',
      bookingId: String(booking._id),
      openedAt: now,
      openedBy: req.user.username
    });
  }
  const created = await TableOrder.insertMany(orders);
  booking.status = 'used';
  booking.usedTableIds = picked.map(t => t.id);
  booking.usedTableId = picked[0].id;
  await booking.save();
  res.status(201).json({ booking, orders: created });
});

// Extra items ordered during the party, on top of the finalised menu. Kept
// on party.extras (only that field is replaced, so it can't clobber form
// edits made on another device) and billed on the food bill. kotQty = how
// many of that line have already gone to the kitchen on a KOT slip.
exports.setExtras = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking || !booking.party) {
    res.status(404);
    throw new Error('Party booking not found');
  }
  if (booking.status !== 'pending') {
    res.status(400);
    throw new Error('Is party ka bill ban chuka hai — extra ab Quick bill se banayein');
  }
  const extras = (Array.isArray(req.body.extras) ? req.body.extras : []).map(x => {
    const qty = Math.max(0, Math.floor(Number(x.qty) || 0));
    return {
      refId: x.refId ? String(x.refId) : null,
      name: String(x.name || '').slice(0, 80),
      qty,
      rate: Math.max(0, Number(x.rate) || 0),
      kotQty: Math.min(qty, Math.max(0, Math.floor(Number(x.kotQty) || 0)))
    };
  }).filter(x => x.name && x.qty > 0);
  booking.party = { ...booking.party, extras };
  booking.markModified('party');
  await booking.save();
  res.json({ booking });
});

// Final bill for a party booking, made from the Party tab without opening
// any table — one bill, with each line tagged play or food. Amounts are the
// estimate lines, already GST-inclusive for food and GST-free for play, so
// they use their own categories ('partyplay' / 'party') and the food-only
// CGST/SGST isn't added on top. The advance is netted like a table checkout:
// payment in the advance's mode, up to the advance, counts as advance.
const PART_CAT = { play: 'partyplay', food: 'party' };

exports.finalBill = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (!booking.party) {
    res.status(400);
    throw new Error('Ye party booking form wali booking nahi hai');
  }
  if (booking.status !== 'pending') {
    res.status(400);
    throw new Error(booking.status === 'used' ? 'Is party ka bill pehle hi ban chuka hai' : 'Cancelled booking ka bill nahi banta');
  }
  if (booking.bills && Object.keys(booking.bills).length) {
    res.status(400);
    throw new Error('Is party ka ek purana bill abhi bhi hai — use Sabhi bills se delete karke phir banayein');
  }
  const { items, pay } = req.body;
  const clean = (Array.isArray(items) ? items : [])
    .map(i => ({ cat: PART_CAT[i.part] || 'party', name: String(i.name || '').slice(0, 120), qty: 1, rate: Math.max(0, Math.round(Number(i.rate) || 0)), meta: null }))
    .filter(i => i.name && i.rate > 0);
  const mode = booking.advanceMode || 'CASH';
  const adv = booking.advance > 0 ? Math.min(booking.advance, Number(pay && pay[mode]) || 0) : 0;
  const p = booking.party;
  let result;
  try {
    result = await finalizeBill({
      phone: booking.phone, name: booking.name,
      kid: p.childName, kidDob: p.dob,
      items: clean, discount: 0, discountType: 'amt', pay,
      staff: req.user.username,
      extra: {
        advance: adv, advanceMode: adv ? mode : '', bookingId: String(booking._id),
        kids: (Number(p.playKids) || Number(p.kids && p.kids.count) || 0) + (Number(p.mgInc && p.mgInc.kids) || 0),
        adults: (Number(p.adults && p.adults.count) || 0) + (Number(p.mgInc && p.mgInc.adults) || 0)
      }
    });
  } catch (e) {
    res.status(e.status || 500);
    throw e;
  }
  booking.status = 'used';
  booking.bills = { main: { id: String(result.bill._id), no: result.bill.no, date: result.bill.date, advance: adv } };
  booking.markModified('bills');
  await booking.save();
  res.status(201).json({ booking, bill: result.bill, customer: result.customer });
});

// Everything about advance money in one place, for the admin Day-end and
// owner reports screens: token advances on future bookings not yet used,
// advances sitting on currently open tables, and advances taken in the
// selected period (bookings created from..to).
exports.advanceSummary = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const [pending, tables, recent] = await Promise.all([
    Booking.find({ status: 'pending', advance: { $gt: 0 } }).sort('eventDate'),
    TableOrder.find({ advance: { $gt: 0 } }).sort('openedAt'),
    from && to ? Booking.find({ advance: { $gt: 0 }, status: { $ne: 'cancelled' } }) : []
  ]);
  const received = recent.filter(b => {
    const d = dstr(new Date(b.createdAt));
    return d >= from && d <= to;
  });
  const sum = list => list.reduce((a, x) => a + (x.advance || 0), 0);
  res.json({
    pending: { total: sum(pending), list: pending.map(b => ({ _id: b._id, name: b.name, phone: b.phone, eventDate: b.eventDate, guests: b.guests, advance: b.advance, advanceMode: b.advanceMode })) },
    openTables: { total: sum(tables), list: tables.map(o => ({ _id: o._id, tableName: o.tableName, name: o.name, advance: o.advance, advanceMode: o.advanceMode })) },
    received: { total: sum(received), count: received.length }
  });
});
