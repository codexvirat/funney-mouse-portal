export function dstr(d) {
  d = d || new Date();
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

export function prettyDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function tstr(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function addDays(s, n) {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return dstr(dt);
}

export function addMonths(s, n) {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setMonth(dt.getMonth() + n);
  return dstr(dt);
}

// Monday–Sunday range containing the given date.
export function weekRange(s) {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(dt); monday.setDate(dt.getDate() + diffToMonday);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  return { from: dstr(monday), to: dstr(sunday) };
}
