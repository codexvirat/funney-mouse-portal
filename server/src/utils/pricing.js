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

module.exports = { slabSorted, priceForMinutes };
