// "HH:MM" string compare, wrapping across midnight when start > end
// (e.g. start "22:00" end "02:00" means the window spans midnight).
function inTimeWindow(hhmm, start, end) {
  if (!start || !end) return false;
  if (start === end) return false;
  if (start < end) return hhmm >= start && hhmm < end;
  return hhmm >= start || hhmm < end;
}

function nowHHMM(d) {
  d = d || new Date();
  const p = n => String(n).padStart(2, '0');
  return p(d.getHours()) + ':' + p(d.getMinutes());
}

module.exports = { inTimeWindow, nowHHMM };
