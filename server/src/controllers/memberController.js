const asyncHandler = require('../utils/asyncHandler');
const Customer = require('../models/Customer');
const { dstr } = require('../utils/date');

function memState(m) {
  const today = dstr();
  if (m.expiresAt && today > m.expiresAt) return 'expired';
  if (m.kind === 'visits') {
    if (m.visits > 0 && (m.visitsLeft || 0) <= 0) return 'used';
    if (m.visits > 0 && m.visitsLeft <= 2) return 'low';
    return 'active';
  }
  if (m.hours > 0 && (m.hoursLeft || 0) <= 0) return 'used';
  if (!m.expiresAt) return m.hours > 0 && m.hoursLeft <= 2 ? 'low' : 'active';
  const days = Math.round((new Date(m.expiresAt + 'T00:00') - new Date(today + 'T00:00')) / 86400000);
  if (days <= 7) return 'expiring';
  if (m.hours > 0 && m.hoursLeft <= 2) return 'low';
  return 'active';
}

exports.listMembers = asyncHandler(async (req, res) => {
  const customers = await Customer.find({ membership: { $ne: null } });
  const order = { expiring: 0, low: 1, active: 2, used: 3, expired: 4 };
  const members = customers
    .map(c => {
      const m = c.membership;
      const state = memState(m);
      return {
        phone: c.phone, altPhone: c.altPhone, name: c.name, kid: c.kid,
        cardHolder: m.cardHolder || '', amount: m.amount || 0, remark: m.remark || '',
        planId: m.planId, planName: m.planName, hours: m.hours, hoursLeft: m.hoursLeft,
        kind: m.kind || 'hours', visits: m.visits || 0, visitsLeft: m.visitsLeft || 0, visitsUsed: m.visitsUsed || 0,
        startedAt: m.startedAt, expiresAt: m.expiresAt, state
      };
    })
    .sort((a, b) => (order[a.state] - order[b.state]) || String(a.expiresAt).localeCompare(String(b.expiresAt)));
  res.json({ members });
});
