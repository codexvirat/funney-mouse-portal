export function billSubtotal(items) {
  return items.reduce((a, i) => a + i.amount, 0);
}

export function billDiscount(items, discount, discountType) {
  const sub = billSubtotal(items);
  if (discountType === 'pct') return Math.min(sub, Math.round(sub * (Number(discount) || 0) / 100));
  return Math.min(sub, Number(discount) || 0);
}

export function billTotal(items, discount, discountType) {
  return Math.max(0, billSubtotal(items) - billDiscount(items, discount, discountType));
}

// Same as billTotal but also nets out server-previewed auto-discounts
// (membership %, happy hour, loyalty points) and adds server-previewed GST
// (CGST + SGST, food only) so the amount shown matches what checkout will
// actually charge — see hooks/useAutoDiscount.
export function billTotalWithAuto(items, discount, discountType, autoDiscount) {
  const auto = (autoDiscount && ((autoDiscount.memberDiscount || 0) + (autoDiscount.happyHourDiscount || 0) + (autoDiscount.pointsDiscount || 0))) || 0;
  const gst = (autoDiscount && ((autoDiscount.cgst || 0) + (autoDiscount.sgst || 0))) || 0;
  const service = (autoDiscount && autoDiscount.serviceCharge) || 0;
  return Math.max(0, billTotal(items, discount, discountType) - auto) + gst + service;
}

export function kidsOnBill(items) {
  return items.filter(i => i.cat === 'play').reduce((a, i) => a + (i.meta && i.meta.kids || 0), 0);
}

export function slabSorted(cfg) {
  return [...(cfg.playSlabs || [])].sort((a, b) => a.minutes - b.minutes);
}

export function priceForMinutes(cfg, mins) {
  const sl = slabSorted(cfg);
  if (!sl.length) return 0;
  for (const s of sl) if (mins <= s.minutes) return s.price;
  const last = sl[sl.length - 1];
  return last.price + Math.ceil((mins - last.minutes) / 30) * (Number(cfg.extraHalfHour) || 0);
}

// Minutes actually played: time since start minus finished pauses, frozen
// while paused. Mirrors server/src/utils/pricing.js playElapsedMins.
export function playElapsedMins(start, pausedMs, pausedAt) {
  if (!start) return 0;
  const end = pausedAt ? new Date(pausedAt).getTime() : Date.now();
  return Math.max(0, Math.round((end - new Date(start).getTime() - (Number(pausedMs) || 0)) / 60000));
}
