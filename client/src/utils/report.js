export function emptyTotals() {
  return { food: 0, play: 0, socks: 0, member: 0, UPI: 0, CASH: 0, CARD: 0, DUE: 0, total: 0, bills: 0, kids: 0, disc: 0, memberPlayMins: 0, cgst: 0, sgst: 0, advance: 0 };
}

export function rollup(bills) {
  const t = emptyTotals();
  bills.forEach(b => {
    if (b.void) return;
    t.bills++; t.total += b.total; t.kids += b.kids || 0; t.disc += b.discount || 0;
    t.cgst += b.cgst || 0; t.sgst += b.sgst || 0; t.advance += b.advance || 0;
    ['UPI', 'CASH', 'CARD', 'DUE'].forEach(k => { t[k] += (b.pay && b.pay[k]) || 0; });
    b.items.forEach(i => {
      t[i.cat] = (t[i.cat] || 0) + i.amount;
      if (i.cat === 'play' && i.meta && i.meta.member) t.memberPlayMins += (i.meta.minutes || 0) * (i.meta.kids || 1);
    });
  });
  return t;
}

// Revenue/visits/turnover per table — only counts bills that came from a
// table (tableName set), skipping quick-bill/walk-in sales.
export function tableRollup(bills) {
  const byTable = {};
  bills.forEach(b => {
    if (b.void || !b.tableName) return;
    const row = byTable[b.tableName] || { name: b.tableName, bills: 0, revenue: 0, totalMins: 0 };
    row.bills++;
    row.revenue += b.total;
    row.totalMins += b.durationMins || 0;
    byTable[b.tableName] = row;
  });
  return Object.values(byTable).sort((a, b) => b.revenue - a.revenue);
}

// Sales per waiter (from the waiter name saved on table bills).
export function waiterRollup(bills) {
  const byWaiter = {};
  bills.forEach(b => {
    if (b.void || !b.waiterName) return;
    const k = b.waiterName.trim();
    const row = byWaiter[k] || { name: k, bills: 0, revenue: 0, guests: 0 };
    row.bills++;
    row.revenue += b.total;
    row.guests += (b.adults || 0) + (b.kids || 0);
    byWaiter[k] = row;
  });
  return Object.values(byWaiter).sort((a, b) => b.revenue - a.revenue);
}
