const asyncHandler = require('../utils/asyncHandler');
const Config = require('../models/Config');

const DEFAULT_CFG = {
  shopName: 'Funny Mouse',
  staffDiscount: true,
  playSlabs: [
    { id: 's1', label: '30 min', minutes: 30, price: 250 },
    { id: 's2', label: '1 hour', minutes: 60, price: 400 },
    { id: 's3', label: '1.5 hour', minutes: 90, price: 550 },
    { id: 's4', label: '2 hour', minutes: 120, price: 700 }
  ],
  extraHalfHour: 150,
  sockPrice: 50,
  adultFree: true,
  menu: [
    { id: 'm1', name: 'Cheese Sandwich', price: 120 }, { id: 'm2', name: 'French Fries', price: 130 },
    { id: 'm3', name: 'Veg Burger', price: 150 }, { id: 'm4', name: 'Pizza (7")', price: 220 },
    { id: 'm5', name: 'Maggi', price: 100 }, { id: 'm6', name: 'White Sauce Pasta', price: 180 },
    { id: 'm7', name: 'Nachos', price: 150 }, { id: 'm8', name: 'Popcorn', price: 60 },
    { id: 'm9', name: 'Cold Coffee', price: 130 }, { id: 'm10', name: 'Chocolate Shake', price: 150 },
    { id: 'm11', name: 'Fresh Lime Soda', price: 80 }, { id: 'm12', name: 'Ice Cream Cup', price: 70 },
    { id: 'm13', name: 'Tea', price: 40 }, { id: 'm14', name: 'Coffee', price: 60 },
    { id: 'm15', name: 'Cold Drink', price: 40 }, { id: 'm16', name: 'Water Bottle', price: 20 }
  ],
  plans: [
    { id: 'p1', name: '10 Hour Pack', price: 2800, hours: 10, days: 90 },
    { id: 'p2', name: '20 Hour Pack', price: 5000, hours: 20, days: 180 },
    { id: 'p3', name: 'Monthly Unlimited', price: 4500, hours: 0, days: 30 }
  ],
  tables: [],
  memberDiscountPercent: 0,
  memberDiscountMinSpend: 0,
  happyHour: { enabled: false, start: '15:00', end: '18:00', discountPercent: 0 },
  cgstPercent: 2.5,
  sgstPercent: 2.5
};

async function getOrCreateConfig() {
  let cfg = await Config.findOne();
  if (!cfg) cfg = await Config.create(DEFAULT_CFG);
  return cfg;
}

exports.getConfig = asyncHandler(async (req, res) => {
  const cfg = await getOrCreateConfig();
  res.json({ config: cfg });
});

exports.updateConfig = asyncHandler(async (req, res) => {
  const cfg = await getOrCreateConfig();
  const fields = ['shopName', 'staffDiscount', 'playSlabs', 'extraHalfHour', 'sockPrice', 'adultFree', 'menu', 'plans', 'tables', 'memberDiscountPercent', 'memberDiscountMinSpend', 'happyHour', 'cgstPercent', 'sgstPercent'];
  fields.forEach(f => {
    if (req.body[f] !== undefined) cfg[f] = req.body[f];
  });
  await cfg.save();
  res.json({ config: cfg });
});
