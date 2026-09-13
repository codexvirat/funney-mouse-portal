const mongoose = require('mongoose');

// _id is the date string (YYYY-MM-DD); seq gives an atomic, race-safe per-day bill number.
const counterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 }
});

module.exports = mongoose.model('Counter', counterSchema);
