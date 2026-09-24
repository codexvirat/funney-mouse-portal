const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const mongoose = require('mongoose');
const { dstr } = require('./date');

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', '..', 'backups');
const KEEP = Number(process.env.BACKUP_KEEP) || 30;

// Every collection as plain JSON (ObjectIds/dates as strings), gzipped.
async function dumpAll() {
  const out = { createdAt: new Date().toISOString(), collections: {} };
  const cols = await mongoose.connection.db.collections();
  for (const c of cols) {
    out.collections[c.collectionName] = await c.find({}).toArray();
  }
  return zlib.gzipSync(Buffer.from(JSON.stringify(out)));
}

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => /^backup-\d{4}-\d{2}-\d{2}\.json\.gz$/.test(f))
    .sort()
    .map(f => ({ file: f, size: fs.statSync(path.join(BACKUP_DIR, f)).size }));
}

async function runDailyBackup() {
  const file = `backup-${dstr()}.json.gz`;
  const full = path.join(BACKUP_DIR, file);
  if (fs.existsSync(full)) return null;
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.writeFileSync(full, await dumpAll());
  const all = listBackups();
  all.slice(0, Math.max(0, all.length - KEEP)).forEach(b => fs.unlinkSync(path.join(BACKUP_DIR, b.file)));
  console.log('Backup saved:', full);
  return file;
}

// Checks hourly; writes at most one backup per day.
function scheduleBackups() {
  const tick = () => runDailyBackup().catch(e => console.error('Backup failed:', e.message));
  setTimeout(tick, 60 * 1000).unref();
  setInterval(tick, 60 * 60 * 1000).unref();
}

module.exports = { dumpAll, listBackups, runDailyBackup, scheduleBackups, BACKUP_DIR };
