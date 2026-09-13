import { tstr } from './date';

export function exportCSV(bills, tag) {
  const head = ['Date', 'Bill No', 'Time', 'Customer', 'Phone', 'Category', 'Item', 'Qty', 'Rate', 'Amount', 'Bill Total', 'UPI', 'Cash', 'Card', 'Due', 'Status'];
  const lines = [head.join(',')];
  const q = s => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const sorted = [...bills].sort((a, b) => (a.date + String(a.no).padStart(4, '0')).localeCompare(b.date + String(b.no).padStart(4, '0')));
  sorted.forEach(b => b.items.forEach((i, ix) => lines.push([
    b.date, b.no, tstr(b.ts), q(b.name), q(b.phone), i.cat, q(i.name),
    i.cat === 'play' ? (i.meta.kids + ' kid × ' + i.meta.minutes + 'min') : i.qty,
    i.rate, i.amount, ix === 0 ? b.total : '', ix === 0 ? (b.pay.UPI || 0) : '', ix === 0 ? (b.pay.CASH || 0) : '',
    ix === 0 ? (b.pay.CARD || 0) : '', ix === 0 ? (b.pay.DUE || 0) : '', b.void ? 'VOID' : 'OK'
  ].join(','))));
  const csv = lines.join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'funny-mouse-sales-' + tag + '.csv';
  a.click();
}
