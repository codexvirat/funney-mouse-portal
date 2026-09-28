// Server-side twin of client/src/utils/bill.js's slab pricing, so the timer
// "end play" endpoint prices minutes the same way the client preview does.

function slabSorted(cfg) {
  return [...(cfg.playSlabs || [])].sort((a, b) => a.minutes - b.minutes);
}

function priceForMinutes(cfg, mins) {
  const sl = slabSorted(cfg);
  if (!sl.length) return 0;
  for (const s of sl) if (mins <= s.minutes) return s.price;
  const last = sl[sl.length - 1];
  return last.price + Math.ceil((mins - last.minutes) / 30) * (Number(cfg.extraHalfHour) || 0);
}


// Minutes actually played on a timer: wall-clock since start, minus every
// completed pause (pausedMs), and frozen at pausedAt while currently paused —
// so a kid who stepped out mid-session isn't charged for that gap.
function playElapsedMins(start, pausedMs, pausedAt) {
  if (!start) return 0;
  const end = pausedAt ? new Date(pausedAt).getTime() : Date.now();
  return Math.max(0, Math.round((end - new Date(start).getTime() - (Number(pausedMs) || 0)) / 60000));
}

module.exports = { slabSorted, priceForMinutes, playElapsedMins };
