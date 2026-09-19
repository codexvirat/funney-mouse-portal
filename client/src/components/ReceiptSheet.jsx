import { useEffect, useRef } from 'react';
import Sheet from './Sheet';
import { INR } from '../utils/money';
import { prettyDate, tstr } from '../utils/date';

const SECTIONS = [
  { cat: 'food', label: 'Food' },
  { cat: 'play', label: 'Play area' },
  { cat: 'socks', label: 'Socks' },
  { cat: 'member', label: 'Membership' }
];

function sectionRows(items) {
  return SECTIONS.map(s => ({ ...s, items: items.filter(i => i.cat === s.cat) })).filter(s => s.items.length);
}

function itemLine(i) {
  return i.cat === 'play' ? (i.meta.minutes + 'min × ' + i.meta.kids) : (i.qty + ' × ' + INR(i.rate));
}

function receiptHTML(b, shopName) {
  const pays = Object.entries(b.pay).filter(([, v]) => v > 0).map(([k, v]) => k + ' ' + INR(v)).join(' · ') || '—';
  const sectionsHtml = sectionRows(b.items).map(s => `
    <tr><td colspan="2" style="font-size:10px;font-weight:bold;padding-top:6px">${s.label.toUpperCase()}</td></tr>
    ${s.items.map(i => `<tr><td>${i.name}<br><span style="font-size:10px">${itemLine(i)}</span></td><td class="rt">${INR(i.amount)}</td></tr>`).join('')}
  `).join('');
  const otherDisc = b.discount - (b.memberDiscount || 0) - (b.happyHourDiscount || 0);
  return `<h3>${shopName}</h3>
    <div style="text-align:center;font-size:11px">Bill #${b.no} · ${prettyDate(b.date)} ${tstr(b.ts)}</div>
    <div style="text-align:center;font-size:11px">${b.name || 'Walk-in'}${b.phone ? ' · ' + b.phone : ''}${b.tableName ? ' · ' + b.tableName : ''}</div><hr>
    <table>${sectionsHtml}</table><hr>
    <table><tr><td>Subtotal</td><td class="rt">${INR(b.subtotal)}</td></tr>
    ${b.memberDiscount ? `<tr><td>Member discount</td><td class="rt">− ${INR(b.memberDiscount)}</td></tr>` : ''}
    ${b.happyHourDiscount ? `<tr><td>Happy hour</td><td class="rt">− ${INR(b.happyHourDiscount)}</td></tr>` : ''}
    ${otherDisc > 0 ? `<tr><td>Discount</td><td class="rt">− ${INR(otherDisc)}</td></tr>` : ''}
    ${b.cgst ? `<tr><td>CGST</td><td class="rt">${INR(b.cgst)}</td></tr>` : ''}
    ${b.sgst ? `<tr><td>SGST</td><td class="rt">${INR(b.sgst)}</td></tr>` : ''}
    <tr><td><b>Total</b></td><td class="rt"><b>${INR(b.total)}</b></td></tr>
    <tr><td colspan="2" style="font-size:11px">${pays}</td></tr></table><hr>
    <div style="text-align:center;font-size:11px">Thank you! Phir aaiyega 🧀</div>`;
}

function whatsappText(b, shopName) {
  const lines = [`*${shopName}*`, `Bill #${b.no} · ${prettyDate(b.date)}`, ''];
  sectionRows(b.items).forEach(s => {
    lines.push(s.label.toUpperCase());
    s.items.forEach(i => lines.push(`${i.name} — ${INR(i.amount)}`));
    lines.push('');
  });
  lines.push(`Subtotal: ${INR(b.subtotal)}`);
  if (b.discount > 0) lines.push(`Discount: − ${INR(b.discount)}`);
  if (b.cgst) lines.push(`CGST: ${INR(b.cgst)}`);
  if (b.sgst) lines.push(`SGST: ${INR(b.sgst)}`);
  lines.push(`Total: ${INR(b.total)}`, '', 'Thank you! Phir aaiyega 🧀');
  return lines.join('\n');
}

export default function ReceiptSheet({ open, bill, customer, config, onClose, doneLabel = 'New bill' }) {
  const shopName = (config && config.shopName) || 'Funny Mouse';

  const print = () => {
    const area = document.getElementById('printarea');
    if (area && bill) area.innerHTML = receiptHTML(bill, shopName);
    window.print();
  };

  // Print automatically as soon as the receipt is shown — payment mode
  // (UPI/cash/card/due) shouldn't matter, a bill always needs a printout.
  // Keyed on bill._id so re-renders (e.g. a poll elsewhere) don't reprint.
  const printedFor = useRef(null);
  useEffect(() => {
    if (open && bill && printedFor.current !== bill._id) {
      printedFor.current = bill._id;
      print();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bill]);

  if (!bill) return <Sheet open={open} onClose={onClose}><div /></Sheet>;
  const pays = Object.entries(bill.pay).filter(([, v]) => v > 0).map(([k, v]) => k + ' ' + INR(v)).join(' · ');
  const sections = sectionRows(bill.items);

  const shareWhatsapp = () => {
    const text = encodeURIComponent(whatsappText(bill, shopName));
    window.open(`https://wa.me/91${bill.phone}?text=${text}`, '_blank');
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div style={{ textAlign: 'center', padding: '6px 0 14px' }}>
        <div style={{ fontSize: 34 }}>🧀</div>
        <h2 style={{ margin: '6px 0 2px', fontSize: 18 }}>Bill #{bill.no} saved</h2>
        <b className="num" style={{ fontSize: 32, fontFamily: "'Bricolage Grotesque'" }}>{INR(bill.total)}</b>
        <p className="hint" style={{ margin: '4px 0 0' }}>{pays} · {bill.name || 'Walk-in'}{bill.tableName ? ' · ' + bill.tableName : ''}</p>
        {bill.waiterName && <p className="hint" style={{ margin: '4px 0 0' }}>Waiter: {bill.waiterName}</p>}
        {bill.memberDiscount > 0 && (
          <p className="hint" style={{ margin: '4px 0 0' }}>Member discount applied: − {INR(bill.memberDiscount)}</p>
        )}
        {bill.happyHourDiscount > 0 && (
          <p className="hint" style={{ margin: '4px 0 0' }}>Happy hour discount: − {INR(bill.happyHourDiscount)}</p>
        )}
        {(bill.cgst > 0 || bill.sgst > 0) && (
          <p className="hint" style={{ margin: '4px 0 0' }}>GST: CGST {INR(bill.cgst)} + SGST {INR(bill.sgst)}</p>
        )}
        {bill.advance > 0 && (
          <p className="hint" style={{ margin: '4px 0 0' }}>Advance collected earlier: {INR(bill.advance)} ({bill.advanceMode})</p>
        )}
        {customer && customer.membership && customer.membership.hours > 0 && (
          <p className="hint" style={{ margin: '6px 0 0' }}>Membership balance: {customer.membership.hoursLeft} hr</p>
        )}
      </div>

      {sections.length > 1 && (
        <div style={{ marginBottom: 14 }}>
          {sections.map(s => (
            <div key={s.cat} className="brk">
              <div className="t"><span>{s.label}</span><b className="num">{INR(s.items.reduce((a, i) => a + i.amount, 0))}</b></div>
            </div>
          ))}
        </div>
      )}

      <div className="row">
        <button className="btn" style={{ flex: '1 1 130px' }} onClick={print}>Print receipt</button>
        {bill.phone && <button className="btn" style={{ flex: '1 1 130px' }} onClick={shareWhatsapp}>Share WhatsApp</button>}
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn primary" style={{ flex: '1 1 100%' }} onClick={onClose}>{doneLabel}</button>
      </div>
    </Sheet>
  );
}
