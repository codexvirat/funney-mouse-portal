const mongoose = require('mongoose');

// A party enquiry (call / walk-in / Instagram) before anything is booked.
// Converted to a party booking from the Party tab; kept for follow-ups.
const inquirySchema = new mongoose.Schema({
  inquiryDate: { type: String, required: true, index: true },
  name: { type: String, default: '' },
  phone: { type: String, default: '' },
  childName: { type: String, default: '' },
  partyDate: { type: String, default: '' },
  kids: { type: Number, default: 0 },
  adults: { type: Number, default: 0 },
  packageInterest: { type: String, default: '' },
  budget: { type: Number, default: 0 },
  source: { type: String, default: '' },
  note: { type: String, default: '' },
  followUpDate: { type: String, default: '' },
  status: { type: String, enum: ['new', 'followup', 'converted', 'lost'], default: 'new' },
  bookingId: { type: String, default: '' },
  createdBy: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Inquiry', inquirySchema);
