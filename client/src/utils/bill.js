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
