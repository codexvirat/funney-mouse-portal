const AuditLog = require('../models/AuditLog');
const { dstr } = require('./date');

// Never let a logging failure break the action being logged.
async function audit(user, action, details, ref) {
  try {
    await AuditLog.create({
      at: new Date().toISOString(), date: dstr(),
      user: (user && user.username) || String(user || ''),
      action, details: details || '', ref: ref ? String(ref) : ''
    });
  } catch (e) {
    console.error('audit log failed:', e.message);
  }
}

module.exports = { audit };
