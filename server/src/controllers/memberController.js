const asyncHandler = require('../utils/asyncHandler');
const Customer = require('../models/Customer');
const { dstr } = require('../utils/date');

function memState(m) {
  const today = dstr();
  if (m.expiresAt && today > m.expiresAt) return 'expired';
  if (m.hours > 0 && (m.hoursLeft || 0) <= 0) return 'used';
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
        phone: c.phone, name: c.name, kid: c.kid,
        planId: m.planId, planName: m.planName, hours: m.hours, hoursLeft: m.hoursLeft,
        startedAt: m.startedAt, expiresAt: m.expiresAt, state
      };
    })
    .sort((a, b) => (order[a.state] - order[b.state]) || String(a.expiresAt).localeCompare(String(b.expiresAt)));
  res.json({ members });
});
