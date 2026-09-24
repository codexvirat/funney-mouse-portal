const mongoose = require('mongoose');

// Day-to-day shop spending (milk, gas, cleaning…), so Day End can show
// profit and what should actually be in the cash drawer.
const expenseSchema = new mongoose.Schema({
  date: { type: String, required: true, index: true },
  desc: { type: String, required: true },
  amount: { type: Number, required: true },
  mode: { type: String, enum: ['CASH', 'UPI', 'CARD'], default: 'CASH' },
  by: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
