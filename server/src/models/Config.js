const mongoose = require('mongoose');

const slabSchema = new mongoose.Schema({ id: String, label: String, minutes: Number, price: Number }, { _id: false });
const menuItemSchema = new mongoose.Schema({ id: String, name: String, price: Number }, { _id: false });
const planSchema = new mongoose.Schema({ id: String, name: String, price: Number, hours: Number, days: Number, discountPercent: { type: Number, default: 0 } }, { _id: false });
const tableSchema = new mongoose.Schema({ id: String, name: String, capacity: Number }, { _id: false });
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
  sgstPercent: { type: Number, default: 2.5 }
}, { timestamps: true });

module.exports = mongoose.model('Config', configSchema);
