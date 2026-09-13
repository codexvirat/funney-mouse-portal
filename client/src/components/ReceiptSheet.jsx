import Sheet from './Sheet';
import { INR } from '../utils/money';
import { prettyDate, tstr } from '../utils/date';

function receiptHTML(b, shopName) {
  const pays = Object.entries(b.pay).filter(([, v]) => v > 0).map(([k, v]) => k + ' ' + INR(v)).join(' · ') || '—';
  const itemsHtml = b.items.map(i => `<tr><td>${i.name}<br><span style="font-size:10px">${i.cat === 'play' ? (i.meta.minutes + 'min × ' + i.meta.kids) : (i.qty + ' × ' + INR(i.rate))}</span></td><td class="rt">${INR(i.amount)}</td></tr>`).join('');
  return `<h3>${shopName}</h3>
    <div style="text-align:center;font-size:11px">Bill #${b.no} · ${prettyDate(b.date)} ${tstr(b.ts)}</div>
    <div style="text-align:center;font-size:11px">${b.name || 'Walk-in'}${b.phone ? ' · ' + b.phone : ''}</div><hr>
    <table>${itemsHtml}</table><hr>
    <table><tr><td>Subtotal</td><td class="rt">${INR(b.subtotal)}</td></tr>
    ${b.discount ? `<tr><td>Discount</td><td class="rt">− ${INR(b.discount)}</td></tr>` : ''}
    <tr><td><b>Total</b></td><td class="rt"><b>${INR(b.total)}</b></td></tr>
    <tr><td colspan="2" style="font-size:11px">${pays}</td></tr></table><hr>
    <div style="text-align:center;font-size:11px">Thank you! Phir aaiyega 🧀</div>`;
}

export default function ReceiptSheet({ open, bill, customer, config, onClose }) {
  if (!bill) return <Sheet open={open} onClose={onClose}><div /></Sheet>;
  const pays = Object.entries(bill.pay).filter(([, v]) => v > 0).map(([k, v]) => k + ' ' + INR(v)).join(' · ');

  const print = () => {
    const area = document.getElementById('printarea');
    if (area) area.innerHTML = receiptHTML(bill, (config && config.shopName) || 'Funny Mouse');
    window.print();
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div style={{ textAlign: 'center', padding: '6px 0 14px' }}>
        <div style={{ fontSize: 34 }}>🧀</div>
        <h2 style={{ margin: '6px 0 2px', fontSize: 18 }}>Bill #{bill.no} saved</h2>
        <b className="num" style={{ fontSize: 32, fontFamily: "'Bricolage Grotesque'" }}>{INR(bill.total)}</b>
        <p className="hint" style={{ margin: '4px 0 0' }}>{pays} · {bill.name || 'Walk-in'}</p>
        {customer && customer.membership && customer.membership.hours > 0 && (
          <p className="hint" style={{ margin: '6px 0 0' }}>Membership balance: {customer.membership.hoursLeft} hr</p>
        )}
      </div>
      <div className="row">
        <button className="btn" style={{ flex: '1 1 130px' }} onClick={print}>Print receipt</button>
        <button className="btn primary" style={{ flex: '2 1 180px' }} onClick={onClose}>New bill</button>
      </div>
    </Sheet>
  );
}
