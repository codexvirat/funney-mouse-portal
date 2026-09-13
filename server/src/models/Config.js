const mongoose = require('mongoose');

const slabSchema = new mongoose.Schema({ id: String, label: String, minutes: Number, price: Number }, { _id: false });
const menuItemSchema = new mongoose.Schema({ id: String, name: String, price: Number }, { _id: false });
const planSchema = new mongoose.Schema({ id: String, name: String, price: Number, hours: Number, days: Number }, { _id: false });

// Single settings document for the whole shop.
const configSchema = new mongoose.Schema({
  shopName: { type: String, default: 'Funny Mouse' },
  staffDiscount: { type: Boolean, default: true },
  playSlabs: { type: [slabSchema], default: [] },
  extraHalfHour: { type: Number, default: 150 },
  sockPrice: { type: Number, default: 50 },
  adultFree: { type: Boolean, default: true },
  menu: { type: [menuItemSchema], default: [] },
  plans: { type: [planSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Config', configSchema);
