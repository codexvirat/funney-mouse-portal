const mongoose = require('mongoose');

// Who did what — bill voids/edits, discounts, cancellations, settings and
// user changes. Append-only; nothing in the app edits or deletes these.
const auditLogSchema = new mongoose.Schema({
  at: { type: String, required: true },
  date: { type: String, required: true, index: true },
  user: { type: String, default: '' },
  action: { type: String, required: true },
  details: { type: String, default: '' },
  ref: { type: String, default: '' }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
