export function emptyTotals() {
  return { byCat: {}, food: 0, play: 0, socks: 0, member: 0, party: 0, partyplay: 0, UPI: 0, CASH: 0, CARD: 0, DUE: 0, total: 0, bills: 0, kids: 0, disc: 0, memberPlayMins: 0, cgst: 0, sgst: 0, service: 0, advance: 0 };
}

const MODES = ['UPI', 'CASH', 'CARD', 'DUE'];

// What each category actually brought in, and in which payment mode. A bill
// can mix categories and split its payment: the bill total minus GST is
// shared across its categories in proportion to their item amounts, GST
// (charged on food only) goes to Food, and each payment mode is shared in
// the same proportion as the resulting amounts. Shares add up to the total.
function addByCat(byCat, b) {
  const sub = b.items.reduce((a, i) => a + (Number(i.amount) || 0), 0);
  const total = Number(b.total) || 0;
  if (sub <= 0 || total <= 0) return;
  const perCat = {};
  b.items.forEach(i => { perCat[i.cat] = (perCat[i.cat] || 0) + (Number(i.amount) || 0); });
  const gst = perCat.food ? (Number(b.cgst) || 0) + (Number(b.sgst) || 0) : 0;
  Object.entries(perCat).forEach(([cat, amt]) => {
    const share = (total - gst) * amt / sub + (cat === 'food' ? gst : 0);
    const row = byCat[cat] || (byCat[cat] = { total: 0, UPI: 0, CASH: 0, CARD: 0, DUE: 0 });
    row.total += share;
    MODES.forEach(m => { row[m] += ((b.pay && b.pay[m]) || 0) * share / total; });
  });
}

export function rollup(bills) {
  const t = emptyTotals();
  bills.forEach(b => {
    if (b.void) return;
    t.bills++; t.total += b.total; t.kids += b.kids || 0; t.disc += b.discount || 0;
    t.cgst += b.cgst || 0; t.sgst += b.sgst || 0; t.service += b.serviceCharge || 0; t.advance += b.advance || 0;
    ['UPI', 'CASH', 'CARD', 'DUE'].forEach(k => { t[k] += (b.pay && b.pay[k]) || 0; });
    addByCat(t.byCat, b);
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

