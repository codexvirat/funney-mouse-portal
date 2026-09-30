const { dstr } = require('./date');

// Server-side twin of client/src/utils/member.js's memberActive — used to
// decide whether the automatic membership discount applies on a bill.
function memberActive(customer) {
  const m = customer && customer.membership;
  if (!m) return false;
  if (m.expiresAt && dstr() > m.expiresAt) return false;
  if (m.kind === 'visits') return !(m.visits > 0 && (m.visitsLeft || 0) <= 0);
  if (m.hours > 0 && (m.hoursLeft || 0) <= 0) return false;
  return true;
}

// Visits a bill's membership play uses: one per kid on each member play line.
// Lines with meta.visitCharged were already charged when a member's table
// was opened, so they're left out unless includeCharged (used when a bill
// is deleted and every visit on it goes back).
function memberVisitsUsed(items, includeCharged = false) {
  return (items || []).filter(i => i.cat === 'play' && i.meta && i.meta.member && (includeCharged || !i.meta.visitCharged))
    .reduce((a, i) => a + (Number(i.meta.kids) || 1), 0);
}

// Visits charged up front on a table, per member phone.
function chargedVisitsByPhone(items) {
  const out = {};
  (items || []).forEach(i => {
    if (i.cat === 'play' && i.meta && i.meta.visitCharged && i.meta.memberPhone) {
      out[i.meta.memberPhone] = (out[i.meta.memberPhone] || 0) + (Number(i.meta.kids) || 1);
    }
  });
  return out;
}

module.exports = { memberActive, memberVisitsUsed, chargedVisitsByPhone };
