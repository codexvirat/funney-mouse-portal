import { dstr } from './date';

export function memberActive(c) {
  if (!c || !c.membership) return false;
  const m = c.membership;
  if (m.expiresAt && dstr() > m.expiresAt) return false;
  if (m.hours > 0 && (m.hoursLeft || 0) <= 0) return false;
  return true;
}

export function memberLabel(c) {
  if (!c || !c.membership) return '';
  const m = c.membership;
  if (!memberActive(c)) return m.planName + ' · expired';
  return m.hours > 0
    ? (m.planName + ' · ' + (Math.round((m.hoursLeft || 0) * 10) / 10) + ' hr left')
    : (m.planName + ' · till ' + m.expiresAt);
}
