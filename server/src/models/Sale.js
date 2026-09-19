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

const saleSchema = new mongoose.Schema({
  date: { type: String, required: true, index: true },
  no: { type: Number, required: true },
  ts: { type: String, required: true },
  phone: { type: String, default: '' },
  name: { type: String, default: 'Walk-in' },
  items: { type: [itemSchema], default: [] },
  subtotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  pay: {
    UPI: { type: Number, default: 0 },
    CASH: { type: Number, default: 0 },
    CARD: { type: Number, default: 0 },
    DUE: { type: Number, default: 0 }
  },
  kids: { type: Number, default: 0 },
  adults: { type: Number, default: 0 },
  tableId: { type: String, default: '' },
  tableName: { type: String, default: '' },
  memberDiscount: { type: Number, default: 0 },
  happyHourDiscount: { type: Number, default: 0 },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  waiterName: { type: String, default: '' },
  advance: { type: Number, default: 0 },
  advanceMode: { type: String, default: '' },
  durationMins: { type: Number, default: 0 },
  staff: { type: String, default: '' },
  void: { type: Boolean, default: false },
  voidReason: { type: String, default: '' },
  voidAt: { type: String, default: '' },
  dueSettledAt: { type: String, default: '' },
  editedAt: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Sale', saleSchema);
