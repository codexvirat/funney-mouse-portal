const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
  planId: String,
  planName: String,
  hours: Number,
  hoursLeft: Number,
  startedAt: String,
  expiresAt: String,
  renewals: { type: Number, default: 0 }
}, { _id: false });

const recentSchema = new mongoose.Schema({
  date: String,
  total: Number,
  billId: String
}, { _id: false });

const customerSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true, index: true },
  name: { type: String, default: '' },
  kid: { type: String, default: '' },
  kidDob: { type: String, default: '' },
  points: { type: Number, default: 0 },
  visits: { type: Number, default: 0 },
  totalSpend: { type: Number, default: 0 },
  lastVisit: { type: String, default: '' },
  recent: { type: [recentSchema], default: [] },
  membership: { type: membershipSchema, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
