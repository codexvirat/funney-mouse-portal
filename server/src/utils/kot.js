// Food lines the kitchen hasn't been told about yet: per menu item + note,
// the qty on the table minus the qty already printed on earlier KOTs. Lines
// flagged meta.kotSent come from the old per-item flag and count as sent.
function itemNote(i) {
  return (i.meta && i.meta.note) || '';
}

function itemKey(i) {
  const note = itemNote(i);
  return (i.refId || i.name) + (note ? '|' + note : '');
}

function pendingKot(order) {
  const ordered = new Map();
  (order.items || []).forEach(i => {
    if (i.cat !== 'food' || (i.meta && i.meta.kotSent)) return;
    const k = itemKey(i);
    const cur = ordered.get(k) || { key: k, name: i.name, note: itemNote(i), qty: 0 };
    cur.qty += Number(i.qty) || 0;
    ordered.set(k, cur);
  });
  (order.kots || []).forEach(kot => kot.items.forEach(s => {
    const cur = ordered.get(s.key);
    if (cur) cur.qty -= s.qty;
  }));
  return [...ordered.values()].filter(i => i.qty > 0);
}

module.exports = { pendingKot, itemKey };
