const asyncHandler = require('../utils/asyncHandler');
const Booking = require('../models/Booking');
const TableOrder = require('../models/TableOrder');
const Config = require('../models/Config');
const { audit } = require('../utils/audit');

exports.listBookings = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const q = status ? { status } : {};
  const bookings = await Booking.find(q).sort('eventDate');
  res.json({ bookings });
});

exports.createBooking = asyncHandler(async (req, res) => {
  const { phone, name, eventDate, guests, tablesCount, advance, advanceMode, note, estimate } = req.body;
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
  const { phone, name, eventDate, guests, tablesCount, advance, advanceMode, note, status, estimate } = req.body;
  if (phone !== undefined) booking.phone = phone;
  if (name !== undefined) booking.name = name;
  if (eventDate !== undefined) booking.eventDate = eventDate;
  if (guests !== undefined) booking.guests = Math.max(0, Number(guests) || 0);
  if (tablesCount !== undefined) booking.tablesCount = Math.max(1, Number(tablesCount) || 1);
  if (advance !== undefined) booking.advance = Math.max(0, Number(advance) || 0);
  if (advanceMode !== undefined) booking.advanceMode = advanceMode;
  if (note !== undefined) booking.note = note;
  if (estimate !== undefined) booking.estimate = Math.max(0, Number(estimate) || 0);
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
