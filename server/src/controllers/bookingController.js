const asyncHandler = require('../utils/asyncHandler');
const Booking = require('../models/Booking');

exports.listBookings = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const q = status ? { status } : {};
  const bookings = await Booking.find(q).sort('eventDate');
  res.json({ bookings });
});

exports.createBooking = asyncHandler(async (req, res) => {
  const { phone, name, eventDate, guests, advance, advanceMode, note } = req.body;
  if (!eventDate) {
    res.status(400);
    throw new Error('Event ki date chahiye');
  }
  const booking = await Booking.create({
    phone: phone || '', name: name || 'Walk-in', eventDate,
    guests: Math.max(0, Number(guests) || 0),
    advance: Math.max(0, Number(advance) || 0),
    advanceMode: advanceMode || 'CASH',
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
  const { phone, name, eventDate, guests, advance, advanceMode, note, status } = req.body;
  if (phone !== undefined) booking.phone = phone;
  if (name !== undefined) booking.name = name;
  if (eventDate !== undefined) booking.eventDate = eventDate;
  if (guests !== undefined) booking.guests = Math.max(0, Number(guests) || 0);
  if (advance !== undefined) booking.advance = Math.max(0, Number(advance) || 0);
  if (advanceMode !== undefined) booking.advanceMode = advanceMode;
  if (note !== undefined) booking.note = note;
  if (status !== undefined) booking.status = status;
  await booking.save();
  res.json({ booking });
});

exports.deleteBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findByIdAndDelete(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  res.json({ booking });
});
