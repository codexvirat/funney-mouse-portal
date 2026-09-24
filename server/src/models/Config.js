const mongoose = require('mongoose');

const slabSchema = new mongoose.Schema({ id: String, label: String, minutes: Number, price: Number }, { _id: false });
const menuItemSchema = new mongoose.Schema({
  id: String, name: String, price: Number,
  category: { type: String, default: '' },
  available: { type: Boolean, default: true }
}, { _id: false });
const planSchema = new mongoose.Schema({ id: String, name: String, price: Number, hours: Number, days: Number, discountPercent: { type: Number, default: 0 } }, { _id: false });
// qrToken goes in the table's QR-order link so strangers can't post orders
// to a table just by guessing its id.
const tableSchema = new mongoose.Schema({ id: String, name: String, capacity: Number, qrToken: { type: String, default: '' } }, { _id: false });
// earnPer: bill rupees per 1 point earned; pointValue: rupees 1 point is worth.
const loyaltySchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  earnPer: { type: Number, default: 100 },
  pointValue: { type: Number, default: 1 }
}, { _id: false });
const happyHourSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  start: { type: String, default: '15:00' },
  end: { type: String, default: '18:00' },
  discountPercent: { type: Number, default: 0 }
}, { _id: false });

// Single settings document for the whole shop.
const configSchema = new mongoose.Schema({
  shopName: { type: String, default: 'Funny Mouse' },
  staffDiscount: { type: Boolean, default: true },
  playSlabs: { type: [slabSchema], default: [] },
  extraHalfHour: { type: Number, default: 150 },
  sockPrice: { type: Number, default: 50 },
  adultFree: { type: Boolean, default: true },
  menu: { type: [menuItemSchema], default: [] },
  plans: { type: [planSchema], default: [] },
  tables: { type: [tableSchema], default: [] },
  memberDiscountPercent: { type: Number, default: 0 },
  memberDiscountMinSpend: { type: Number, default: 0 },
  happyHour: { type: happyHourSchema, default: () => ({}) },
  cgstPercent: { type: Number, default: 2.5 },
  sgstPercent: { type: Number, default: 2.5 },
  loyalty: { type: loyaltySchema, default: () => ({}) },
  qrOrdering: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Config', configSchema);
