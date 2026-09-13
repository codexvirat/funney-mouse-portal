const asyncHandler = require('../utils/asyncHandler');
const Customer = require('../models/Customer');

exports.getByPhone = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ phone: req.params.phone });
  res.json({ customer: customer || null });
});
