const { dstr } = require('./date');

// Server-side twin of client/src/utils/member.js's memberActive — used to
// decide whether the automatic membership discount applies on a bill.
function memberActive(customer) {
  const m = customer && customer.membership;
  if (!m) return false;
  if (m.expiresAt && dstr() > m.expiresAt) return false;
  if (m.hours > 0 && (m.hoursLeft || 0) <= 0) return false;
  return true;
}

module.exports = { memberActive };
