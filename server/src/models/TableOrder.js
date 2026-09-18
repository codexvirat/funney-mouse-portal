const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  cat: String,
  refId: { type: String, default: null },
  name: String,
  qty: Number,
  rate: Number,
  amount: Number,
  meta: { type: mongoose.Schema.Types.Mixed, default: null }
}, { _id: false });

// One document per currently-open table (a group's whole visit: food + play).
// Deleted once the table is billed (checkout) or cancelled.
const tableOrderSchema = new mongoose.Schema({
  tableId: { type: String, required: true },
  tableName: { type: String, default: '' },
  phone: { type: String, default: '' },
  name: { type: String, default: 'Walk-in' },
  adults: { type: Number, default: 0 },
  kids: { type: Number, default: 0 },
  items: { type: [itemSchema], default: [] },
  playStart: { type: String, default: null },
  playKids: { type: Number, default: 0 },
  playMember: { type: Boolean, default: false },
  reserved: { type: Boolean, default: false },
  reservedNote: { type: String, default: '' },
  waiterName: { type: String, default: '' },
  advance: { type: Number, default: 0 },
  advanceMode: { type: String, default: '' },
  openedAt: { type: String, required: true },
  openedBy: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('TableOrder', tableOrderSchema);
