// One-time handover: wipe all trial data (bills, sessions, customers,
// bookings…) and load the shop's existing members. Settings (menu, plans,
// tables) and staff logins are kept.
//
//   node src/scripts/handover.js members.json            preview only
//   node src/scripts/handover.js members.json --confirm  backup, wipe, import
//
// members.json is a list of rows from the membership register:
//   { parent, kid, phone, start: 'DD/MM/YYYY', total, done, left }
// total 0 = unlimited visits. Rows sharing a phone become one membership
// (the app keeps one membership per phone): kids are joined, visits added up.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Config = require('../models/Config');
const Customer = require('../models/Customer');
const { dumpAll, BACKUP_DIR } = require('../utils/backup');

const KEEP = ['configs', 'users'];

const title = s => String(s || '').trim().toLowerCase().replace(/(^|[\s/(.-])(\w)/g, (m, a, b) => a + b.toUpperCase());
const uniq = arr => [...new Set(arr.filter(Boolean))];

function isoDate(s) {
  const [d, m, y] = String(s).replace(/\s/g, '').split('/').map(Number);
  const yy = y < 100 ? 2000 + y : y;
  if (!d || !m || !yy) throw new Error('Bad date: ' + s);
  return `${yy}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function planLabel(total) {
  return total ? `${total} Visits Pass` : 'Unlimited Lifetime';
}

function buildMembers(rows, plans) {
  const byPhone = new Map();
  rows.forEach(r => {
    const phone = String(r.phone).replace(/\D/g, '');
    if (phone.length !== 10) throw new Error(`Bad phone for ${r.parent}: ${r.phone}`);
    if (!byPhone.has(phone)) byPhone.set(phone, []);
    byPhone.get(phone).push(r);
  });

  return [...byPhone].map(([phone, rs]) => {
    const unlimited = rs.some(r => !r.total);
    const visits = unlimited ? 0 : rs.reduce((s, r) => s + r.total, 0);
    const visitsUsed = rs.reduce((s, r) => s + (r.done || 0), 0);
    const visitsLeft = unlimited ? 0 : rs.reduce((s, r) => s + (r.left || 0), 0);
    const startedAt = rs.map(r => isoDate(r.start)).sort()[0];
    // A single pass that matches a Setup plan keeps that plan's id, so
    // renewals stack and its member discount applies.
    const plan = rs.length === 1 && plans.find(p => p.kind === 'visits' && p.visits === (rs[0].total || 0));
    const altPhones = uniq(rs.map(r => r.altPhone));
    return {
      phone,
      name: uniq(rs.map(r => title(r.parent))).join(' / ') + (altPhones.length ? ` (alt ${altPhones.join(', ')})` : ''),
      kid: uniq(rs.flatMap(r => String(r.kid).split('/')).map(title)).join(', '),
      membership: {
        planId: plan ? plan.id : '',
        planName: plan ? plan.name : uniq(rs.map(r => planLabel(r.total))).join(' + ') + (rs.length > 1 && !unlimited ? ` (${rs.length} passes)` : ''),
        kind: 'visits', hours: 0, hoursLeft: 0,
        visits, visitsLeft, visitsUsed,
        startedAt, expiresAt: '', renewals: 0
      }
    };
  });
}

(async () => {
  const [file, flag] = process.argv.slice(2);
  if (!file) { console.log('Usage: node src/scripts/handover.js members.json [--confirm]'); process.exit(1); }
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));

  await mongoose.connect(process.env.MONGODB_URI);
  const cfg = await Config.findOne();
  const members = buildMembers(rows, (cfg && cfg.plans) || []);

  const cols = (await mongoose.connection.db.collections()).filter(c => !KEEP.includes(c.collectionName));
  console.log('Database:', mongoose.connection.db.databaseName);
  console.log('\nWill delete everything in:');
  for (const c of cols) console.log(`  ${c.collectionName}: ${await c.countDocuments()} docs`);
  console.log(`\nWill import ${members.length} members (from ${rows.length} rows):`);
  members.forEach(m => {
    const v = m.membership;
    const left = v.visits ? `${v.visitsLeft}/${v.visits} left` : 'unlimited';
    console.log(`  ${m.phone}  ${m.name} — ${m.kid} | ${v.planName} | ${left}, ${v.visitsUsed} used | since ${v.startedAt}`);
  });

  if (flag !== '--confirm') {
    console.log('\nPreview only. Run again with --confirm to do it.');
    return mongoose.disconnect();
  }

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const backup = path.join(BACKUP_DIR, `handover-before-${Date.now()}.json.gz`);
  fs.writeFileSync(backup, await dumpAll());
  console.log('\nBackup saved:', backup);

  for (const c of cols) await c.deleteMany({});
  await Customer.insertMany(members.map(m => ({ ...m, visits: 0, totalSpend: 0, points: 0, recent: [] })));
  console.log(`Done: old data cleared, ${members.length} members imported.`);
  await mongoose.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
