import { dstr } from './date';

export function memberActive(c) {
  if (!c || !c.membership) return false;
  const m = c.membership;
  if (m.expiresAt && dstr() > m.expiresAt) return false;
  if (m.kind === 'visits') return !(m.visits > 0 && (m.visitsLeft || 0) <= 0);
  if (m.hours > 0 && (m.hoursLeft || 0) <= 0) return false;
  return true;
}

// "7 / 10 visits", "Unlimited visits", "3.5 / 10 hr", "Unlimited"
export function memberBalance(m) {
  if (!m) return '';
  if (m.kind === 'visits') return m.visits > 0 ? `${m.visitsLeft || 0} / ${m.visits} visits` : 'Unlimited visits';
  return m.hours > 0 ? `${Math.round((m.hoursLeft || 0) * 10) / 10} / ${m.hours} hr` : 'Unlimited';
}

export function memberValidity(m) {
  return m && m.expiresAt ? 'till ' + m.expiresAt : 'Lifetime';
}

export function memberLabel(c) {
  if (!c || !c.membership) return '';
  const m = c.membership;
  if (!memberActive(c)) return m.planName + (m.expiresAt && dstr() > m.expiresAt ? ' · expired' : ' · khatam');
  if (m.kind === 'visits') return m.planName + ' · ' + (m.visits > 0 ? (m.visitsLeft || 0) + ' visits left' : 'unlimited visits') + (m.expiresAt ? ' · till ' + m.expiresAt : ' · lifetime');
  return m.hours > 0
    ? (m.planName + ' · ' + (Math.round((m.hoursLeft || 0) * 10) / 10) + ' hr left')
    : (m.planName + ' · till ' + m.expiresAt);
}

// What a plan gives, for the plan tiles: "10 visits · Lifetime", "20 hrs · 30 days"
export function planSummary(pl) {
  const what = pl.kind === 'visits'
    ? (pl.visits > 0 ? pl.visits + ' visits' : 'Unlimited visits')
    : (pl.hours > 0 ? pl.hours + ' hrs' : 'Unlimited');
  return what + ' · ' + (pl.days > 0 ? pl.days + ' days' : 'Lifetime');
}
