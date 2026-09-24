const mongoose = require('mongoose');

// An advance/token booking taken for a future party — e.g. a customer calls
// 10 days ahead, pays a token amount to hold a slot. Independent of the live
// Tables grid (it doesn't block a specific table until the day it's used).
const bookingSchema = new mongoose.Schema({
  phone: { type: String, default: '' },
  name: { type: String, default: 'Walk-in' },
  eventDate: { type: String, required: true },
  guests: { type: Number, default: 0 },
  tablesCount: { type: Number, default: 1 },
  advance: { type: Number, default: 0 },
  advanceMode: { type: String, default: 'CASH' },
  estimate: { type: Number, default: 0 },
  note: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'used', 'cancelled'], default: 'pending' },
  createdBy: { type: String, default: '' },
  usedTableId: { type: String, default: '' },
  usedTableIds: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
