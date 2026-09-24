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

// One Kitchen Order Ticket sent for this table. Kept apart from `items` —
// the billing screen PATCHes the whole items array, so any flag stored on an
// item would get overwritten by a stale copy. Pending-for-kitchen is always
// computed as (food qty in items) − (qty already sent in kots).
const kotSchema = new mongoose.Schema({
  no: Number,
  at: String,
  by: { type: String, default: '' },
  items: { type: [new mongoose.Schema({ key: String, name: String, qty: Number, note: { type: String, default: '' } }, { _id: false })], default: [] },
  readyAt: { type: String, default: '' },
  servedAt: { type: String, default: '' }
}, { _id: false });

// A food order a customer placed from the table's QR code. Staff accept it
// (items get added to the bill) or reject it.
const requestSchema = new mongoose.Schema({
  id: String,
  at: String,
  name: { type: String, default: '' },
  items: { type: [itemSchema], default: [] },
  status: { type: String, enum: ['new', 'accepted', 'rejected'], default: 'new' }
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
  playPlannedMins: { type: Number, default: 0 },
  reserved: { type: Boolean, default: false },
  reservedNote: { type: String, default: '' },
  waiterName: { type: String, default: '' },
  advance: { type: Number, default: 0 },
  advanceMode: { type: String, default: '' },
  kots: { type: [kotSchema], default: [] },
  requests: { type: [requestSchema], default: [] },
  bookingId: { type: String, default: '' },
  openedAt: { type: String, required: true },
  openedBy: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('TableOrder', tableOrderSchema);
