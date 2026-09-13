export function emptyTotals() {
  return { food: 0, play: 0, socks: 0, member: 0, UPI: 0, CASH: 0, CARD: 0, DUE: 0, total: 0, bills: 0, kids: 0, disc: 0, memberPlayMins: 0 };
}

export function rollup(bills) {
  const t = emptyTotals();
  bills.forEach(b => {
    if (b.void) return;
    t.bills++; t.total += b.total; t.kids += b.kids || 0; t.disc += b.discount || 0;
    ['UPI', 'CASH', 'CARD', 'DUE'].forEach(k => { t[k] += (b.pay && b.pay[k]) || 0; });
    b.items.forEach(i => {
      t[i.cat] = (t[i.cat] || 0) + i.amount;
      if (i.cat === 'play' && i.meta && i.meta.member) t.memberPlayMins += (i.meta.minutes || 0) * (i.meta.kids || 1);
    });
  });
  return t;
}
