const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const TableOrder = require('../models/TableOrder');
const { getOrCreateConfig } = require('./configController');
const { broadcast } = require('../utils/events');

// QR ordering: customers scan the code on their table and send a food order.
// No login — the table's secret token in the link is the only check, and
// orders only land as "requests" that staff must accept before they reach
// the bill or the kitchen.

async function findTable(req, res) {
  const cfg = await getOrCreateConfig();
  const table = (cfg.tables || []).find(t => t.id === req.params.tableId);
  const token = String(req.query.t || (req.body && req.body.t) || '');
  if (!table || !table.qrToken || token !== table.qrToken) {
    res.status(404);
    throw new Error('Ye QR code valid nahi hai');
  }
  if (cfg.qrOrdering === false) {
    res.status(403);
    throw new Error('Abhi QR se order band hai — staff ko bulaiye');
  }
  return { cfg, table };
}

exports.getTableMenu = asyncHandler(async (req, res) => {
  const { cfg, table } = await findTable(req, res);
  const order = await TableOrder.findOne({ tableId: table.id });
  res.json({
    shopName: cfg.shopName,
    tableName: table.name,
    open: !!(order && !order.reserved),
    menu: (cfg.menu || [])
      .filter(m => m.available !== false)
      .map(m => ({ id: m.id, name: m.name, price: m.price, category: m.category || '' }))
  });
});

// Very small per-IP limiter so one phone can't flood a table with orders.
const hits = new Map();
function tooMany(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 10;
}

exports.placeOrder = asyncHandler(async (req, res) => {
  const { cfg, table } = await findTable(req, res);
  if (tooMany(req.ip)) {
    res.status(429);
    throw new Error('Bahut saare orders — thodi der baad try karein ya staff ko bulaiye');
  }
  const order = await TableOrder.findOne({ tableId: table.id });
  if (!order || order.reserved) {
    res.status(409);
    throw new Error('Table abhi open nahi hai — staff ko bulaiye');
  }
  if (order.requests.filter(r => r.status === 'new').length >= 3) {
    res.status(429);
    throw new Error('Pichla order abhi staff ne confirm nahi kiya — thoda ruk jaiye');
  }
  const byId = new Map((cfg.menu || []).filter(m => m.available !== false).map(m => [m.id, m]));
  const lines = (Array.isArray(req.body.items) ? req.body.items : []).slice(0, 25);
  const items = [];
  for (const l of lines) {
    const m = byId.get(l.id);
    const qty = Math.min(20, Math.max(0, Math.floor(Number(l.qty) || 0)));
    if (!m || !qty) continue;
    const note = String(l.note || '').trim().slice(0, 80);
    items.push({ cat: 'food', refId: m.id, name: m.name, qty, rate: m.price, amount: qty * m.price, meta: note ? { note } : null });
  }
  if (!items.length) {
    res.status(400);
    throw new Error('Kam se kam ek item chuniye');
  }
  const request = {
    id: crypto.randomBytes(5).toString('hex'),
    at: new Date().toISOString(),
    name: String(req.body.name || '').trim().slice(0, 40),
    items,
    status: 'new'
  };
  await TableOrder.updateOne({ _id: order._id }, { $push: { requests: request } });
  broadcast('tables');
  res.status(201).json({ ok: true, total: items.reduce((a, i) => a + i.amount, 0) });
});
