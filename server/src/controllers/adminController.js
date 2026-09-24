const asyncHandler = require('../utils/asyncHandler');
const { dumpAll, listBackups, runDailyBackup, BACKUP_DIR } = require('../utils/backup');
const { dstr } = require('../utils/date');
const { audit } = require('../utils/audit');

exports.downloadBackup = asyncHandler(async (req, res) => {
  const buf = await dumpAll();
  await audit(req.user, 'Backup downloaded', `${Math.round(buf.length / 1024)} KB`);
  res.setHeader('Content-Type', 'application/gzip');
  res.setHeader('Content-Disposition', `attachment; filename="funny-mouse-backup-${dstr()}.json.gz"`);
  res.send(buf);
});

// Also makes sure today's automatic backup exists.
exports.backupStatus = asyncHandler(async (req, res) => {
  await runDailyBackup().catch(() => null);
  res.json({ dir: BACKUP_DIR, backups: listBackups().reverse() });
});
