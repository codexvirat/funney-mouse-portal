const mongoose = require('mongoose');

// One document per running play-area timer.
const sessionSchema = new mongoose.Schema({
  start: { type: String, required: true },
  kids: { type: Number, default: 1 },
  phone: { type: String, default: '' },
  name: { type: String, default: 'Walk-in' },
  member: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);
