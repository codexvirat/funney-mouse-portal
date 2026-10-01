const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
  planId: String,
  planName: String,
  hours: Number,
  hoursLeft: Number,
  startedAt: String,
  expiresAt: String,
  renewals: { type: Number, default: 0 },
  // Visit passes: visits = 0 means unlimited; one visit is used per kid each
  // time membership play is billed.
  kind: { type: String, default: 'hours' },
  visits: { type: Number, default: 0 },
  visitsLeft: { type: Number, default: 0 },
  visitsUsed: { type: Number, default: 0 },
  // From the membership register: whose name is on the card, what was paid
  // (all passes on this membership together) and any note.
  cardHolder: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  remark: { type: String, default: '' }
}, { _id: false });

const recentSchema = new mongoose.Schema({
  date: String,
  total: Number,
  billId: String
}, { _id: false });

const customerSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true, index: true },
  name: { type: String, default: '' },
  altPhone: { type: String, default: '' },
  kid: { type: String, default: '' },
  kidDob: { type: String, default: '' },
  anniversary: { type: String, default: '' },
  points: { type: Number, default: 0 },
  visits: { type: Number, default: 0 },
  totalSpend: { type: Number, default: 0 },
  lastVisit: { type: String, default: '' },
  recent: { type: [recentSchema], default: [] },
  membership: { type: membershipSchema, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
