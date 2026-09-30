import { useEffect, useRef } from 'react';
import Sheet from './Sheet';
import { INR } from '../utils/money';
import { prettyDate, tstr } from '../utils/date';
import { esc } from '../utils/html';

const SECTIONS = [
  { cat: 'food', label: 'Food' },
  { cat: 'play', label: 'Play area' },
  { cat: 'socks', label: 'Socks' },
  { cat: 'member', label: 'Membership' },
  { cat: 'partyplay', label: 'Party — Play' },
  { cat: 'party', label: 'Party — Food' }
];

function sectionRows(items) {
  return SECTIONS.map(s => ({ ...s, items: items.filter(i => i.cat === s.cat) })).filter(s => s.items.length);
}

function itemLine(i) {
  return i.cat === 'play' ? (i.meta.minutes + 'min × ' + i.meta.kids) : (i.qty + ' × ' + INR(i.rate));
}

const n2 = (v) => (Number(v) || 0).toFixed(2);

// "2026-09-24" -> "24/09/26"
function shortDate(d) {
  const [y, m, day] = String(d || '').split('-');
  return y ? `${day}/${m}/${y.slice(2)}` : '';
}

function itemName(i) {
  if (i.cat === 'play' && i.meta) return `${i.name} (${i.meta.minutes} min)`;
  return i.name;
}

const pct = (v) => (Number(v) || 0).toString().replace(/\.0+$/, '');

// Thermal (80mm) bill in the usual restaurant format: shop header, bill
// details, Item/Qty/Price/Amount table, taxes, big grand total. Sizes live
// in theme.css under @media print (.rc-*).
function receiptHTML(b, config, customer) {
  const cfg = config || {};
  const shopName = cfg.shopName || 'Funny Mouse';
  const lines = (txt) => String(txt || '').split('\n').map(l => l.trim()).filter(Boolean);
  const head = [
    ...(cfg.legalName ? [esc(cfg.legalName)] : []),
    ...(cfg.gstin ? ['GSTIN No: ' + esc(cfg.gstin)] : []),
    ...lines(cfg.shopAddress).map(esc),
    ...(cfg.shopPhone ? ['Ph: ' + esc(cfg.shopPhone)] : [])
  ];
  const totalQty = b.items.reduce((a, i) => a + (Number(i.qty) || 0), 0);
  const rows = b.items.map(i => `<tr><td>${esc(itemName(i))}</td><td class="rt">${i.qty}</td><td class="rt">${n2(i.rate)}</td><td class="rt">${n2(i.amount)}</td></tr>`).join('');
  const otherDisc = b.discount - (b.memberDiscount || 0) - (b.happyHourDiscount || 0) - (b.pointsDiscount || 0);
  // GST is only on food — say so on the bill so it doesn't read as tax on
  // the whole subtotal (play area is tax-free).
  const foodSub = b.items.filter(i => i.cat === 'food').reduce((a, i) => a + (i.amount || 0), 0);
  const onFood = foodSub !== b.subtotal ? ` <span class="rc-s">(on food ${n2(foodSub)})</span>` : '';
  const grand = Math.round(b.total);
  const roundOff = Math.round((grand - b.total) * 100) / 100;
  const tr = (label, val) => `<tr><td class="rt">${label}</td><td class="rt rc-v">${val}</td></tr>`;
  const pays = Object.entries(b.pay).filter(([, v]) => v > 0).map(([k, v]) => `${k === 'DUE' ? 'Due' : k} ${INR(v)}`).join(' + ');
  const footer = lines(cfg.receiptFooter == null ? 'Thank you\nVisit Again!' : cfg.receiptFooter);

  return `<div class="rc">
    <div class="rc-shop">${esc(shopName)}</div>
    ${head.map(l => `<div class="rc-c">${l}</div>`).join('')}
    <div class="rc-line"></div>
    <div>Name: ${esc(b.name && b.name !== 'Walk-in' ? b.name : '')}${b.phone ? ' (' + esc(b.phone) + ')' : ''}</div>
    <div class="rc-line thin"></div>
    <table class="rc-meta">
      <tr><td>Date: ${shortDate(b.date)} ${tstr(b.ts)}</td><td class="rt"><b>${b.tableName ? 'Dine In: ' + esc(b.tableName) : 'Counter'}</b></td></tr>
      <tr><td>Cashier: ${esc(b.staff || '')}</td><td class="rt">Bill No.: <b>${b.no}</b></td></tr>
    </table>
    <div class="rc-line"></div>
    <table class="rc-items">
      <thead><tr><th>Item</th><th class="rt">Qty.</th><th class="rt">Price</th><th class="rt">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="rc-line"></div>
    <table class="rc-tot">
      <tr><td>Total Qty: ${totalQty}</td><td class="rt">Sub Total</td><td class="rt rc-v">${n2(b.subtotal)}</td></tr>
    </table>
    <table class="rc-tot">
      ${b.memberDiscount ? tr('Member discount', '−' + n2(b.memberDiscount)) : ''}
      ${b.happyHourDiscount ? tr('Happy hour', '−' + n2(b.happyHourDiscount)) : ''}
      ${b.pointsDiscount ? tr(`Loyalty points (${b.pointsRedeemed})`, '−' + n2(b.pointsDiscount)) : ''}
      ${otherDisc > 0 ? tr('Discount', '−' + n2(otherDisc)) : ''}
      ${b.cgst ? tr(`CGST${cfg.cgstPercent ? ' ' + pct(cfg.cgstPercent) + '%' : ''}${onFood}`, n2(b.cgst)) : ''}
      ${b.sgst ? tr(`SGST${cfg.sgstPercent ? ' ' + pct(cfg.sgstPercent) + '%' : ''}${onFood}`, n2(b.sgst)) : ''}
      ${b.serviceCharge ? tr(`Service charge${b.serviceChargePct ? ' ' + pct(b.serviceChargePct) + '%' : ''}`, n2(b.serviceCharge)) : ''}
    </table>
    <div class="rc-line"></div>
    ${roundOff ? `<table class="rc-tot">${tr('Round off', (roundOff > 0 ? '+' : '') + n2(roundOff))}</table>` : ''}
    <table class="rc-tot"><tr><td class="rt rc-grand">Grand Total</td><td class="rt rc-grand">₹${n2(grand)}</td></tr></table>
    <div class="rc-line"></div>
    ${pays ? `<div class="rc-c">Paid: ${pays}</div>` : ''}
    ${b.advance > 0 ? `<div class="rc-c">Advance pehle mila: ${INR(b.advance)} (${esc(b.advanceMode)})</div>` : ''}
    ${b.pointsEarned ? `<div class="rc-c">Is bill se ${b.pointsEarned} loyalty points mile${customer && customer.points != null ? ` · total ${customer.points}` : ''}</div>` : ''}
    ${footer.length ? `<div class="rc-foot">${footer.map(esc).join('<br>')}</div>` : ''}
  </div>`;
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
  if (b.serviceCharge) lines.push(`Service charge${b.serviceChargePct ? ' ' + b.serviceChargePct + '%' : ''}: ${INR(b.serviceCharge)}`);
  lines.push(`Total: ${INR(b.total)}`, '', 'Thank you! Phir aaiyega 🧀');
  return lines.join('\n');
}

export default function ReceiptSheet({ open, bill, customer, config, onClose, doneLabel = 'New bill' }) {
  const shopName = (config && config.shopName) || 'Funny Mouse';

  const print = () => {
    const area = document.getElementById('printarea');
    if (area && bill) area.innerHTML = receiptHTML(bill, config, customer);
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
        {bill.memberDiscount > 0 && (
          <p className="hint" style={{ margin: '4px 0 0' }}>Member discount applied: − {INR(bill.memberDiscount)}</p>
        )}
        {bill.happyHourDiscount > 0 && (
          <p className="hint" style={{ margin: '4px 0 0' }}>Happy hour discount: − {INR(bill.happyHourDiscount)}</p>
        )}
        {(bill.cgst > 0 || bill.sgst > 0) && (
          <p className="hint" style={{ margin: '4px 0 0' }}>GST (sirf food par): CGST {INR(bill.cgst)} + SGST {INR(bill.sgst)}</p>
        )}
        {bill.serviceCharge > 0 && (
          <p className="hint" style={{ margin: '4px 0 0' }}>Service charge{bill.serviceChargePct ? ` ${bill.serviceChargePct}%` : ''}: {INR(bill.serviceCharge)}</p>
        )}
        {(bill.pointsEarned > 0 || bill.pointsDiscount > 0) && (
          <p className="hint" style={{ margin: '4px 0 0' }}>
            {bill.pointsDiscount > 0 ? `${bill.pointsRedeemed} points use hue (− ${INR(bill.pointsDiscount)})` : ''}
            {bill.pointsDiscount > 0 && bill.pointsEarned > 0 ? ' · ' : ''}
            {bill.pointsEarned > 0 ? `${bill.pointsEarned} points mile` : ''}
            {customer && customer.points != null ? ` · balance ${customer.points}` : ''}
          </p>
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
