import { esc } from './html';

// Mirrors server/src/utils/kot.js: per menu item + note, food qty on the
// table minus qty already printed on earlier KOTs. Lines flagged
// meta.kotSent are from the old per-item flag and count as already sent.
function itemNote(i) {
  return (i.meta && i.meta.note) || '';
}

export function pendingKot(order) {
  const ordered = new Map();
  (order.items || []).forEach(i => {
    if (i.cat !== 'food' || (i.meta && i.meta.kotSent)) return;
    const note = itemNote(i);
    const k = (i.refId || i.name) + (note ? '|' + note : '');
    const cur = ordered.get(k) || { key: k, name: i.name, note, qty: 0 };
    cur.qty += Number(i.qty) || 0;
    ordered.set(k, cur);
  });
  (order.kots || []).forEach(kot => kot.items.forEach(s => {
    const cur = ordered.get(s.key);
    if (cur) cur.qty -= s.qty;
  }));
  return [...ordered.values()].filter(i => i.qty > 0);
}

export function kotHTML(order, kot, shopName, reprint) {
  const rows = kot.items.map(i => `<tr><td style="font-size:14px">${esc(i.name)}${i.note ? `<br><b style="font-size:12px">» ${esc(i.note)}</b>` : ''}</td><td class="rt" style="font-size:14px;vertical-align:top"><b>×${i.qty}</b></td></tr>`).join('');
  const time = new Date(kot.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return `<h3>${shopName} — KOT #${kot.no}${reprint ? ' (REPRINT)' : ''}</h3>
    <div style="text-align:center;font-size:16px;font-weight:bold">${esc(order.tableName)}</div>
    <div style="text-align:center;font-size:11px">${time}${order.waiterName ? ' · Waiter: ' + esc(order.waiterName) : ''}${order.adults + order.kids ? ' · ' + (order.adults + order.kids) + ' guests' : ''}</div><hr>
    <table>${rows}</table>`;
}

export function printKotSlip(order, kot, shopName, reprint) {
  const area = document.getElementById('printarea');
  if (area) area.innerHTML = kotHTML(order, kot, shopName, reprint);
  window.print();
}
