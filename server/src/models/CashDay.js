const mongoose = require('mongoose');

// Cash drawer for one day: _id is the date (YYYY-MM-DD). Opening cash is
// counted in the morning, closing cash at night; the difference against
// the expected amount shows any shortage.
const cashDaySchema = new mongoose.Schema({
  _id: String,
  opening: { type: Number, default: null },
  openingBy: { type: String, default: '' },
  closing: { type: Number, default: null },
  closingBy: { type: String, default: '' },
  note: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('CashDay', cashDaySchema);
