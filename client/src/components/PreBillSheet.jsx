import { useEffect, useRef } from 'react';
import { INR } from '../utils/money';
import Sheet from './Sheet';
import { receiptHTML } from './ReceiptSheet';

// Step before payment: the bill is printed for the customer first (marked
// PAYMENT PENDING, nothing saved), they check it and say how they'll pay.
// "Edit" goes back to the items; "Payment lein" opens the payment modes and
// only then is the final bill saved and printed.
export function draftBill({ items, sub, disc, autoDiscount, total, serviceCharge, serviceChargeType, name, phone, tableName, staff, advance, advanceMode }) {
  const a = autoDiscount || {};
  const now = new Date();
  const p = n => String(n).padStart(2, '0');
  return {
    provisional: true,
    date: now.getFullYear() + '-' + p(now.getMonth() + 1) + '-' + p(now.getDate()),
    ts: now.toISOString(),
    no: null,
    name: name || 'Walk-in', phone: phone || '', tableName: tableName || '', staff: staff || '',
    items: items.map(({ id, ...rest }) => rest),
    subtotal: sub,
    discount: (disc || 0) + (a.memberDiscount || 0) + (a.happyHourDiscount || 0) + (a.pointsDiscount || 0),
    memberDiscount: a.memberDiscount || 0, happyHourDiscount: a.happyHourDiscount || 0, pointsDiscount: a.pointsDiscount || 0,
    cgst: a.cgst || 0, sgst: a.sgst || 0,
    serviceCharge: a.serviceCharge || 0, serviceChargePct: serviceChargeType === 'pct' ? (Number(serviceCharge) || 0) : 0,
    total, pay: {}, advance: advance || 0, advanceMode: advanceMode || ''
  };
}

export default function PreBillSheet({ open, bill, config, onEdit, onPay }) {
  const print = () => {
    const area = document.getElementById('printarea');
    if (area && bill) area.innerHTML = receiptHTML(bill, config);
    window.print();
  };

  // Print as soon as it opens; opening again with the same bill (e.g. after
  // looking at the items without changing them) doesn't print twice.
  const sig = bill ? JSON.stringify([bill.items, bill.total, bill.name]) : '';
  const printed = useRef('');
  useEffect(() => {
    if (open && bill && printed.current !== sig) {
      printed.current = sig;
      print();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sig]);

  if (!bill) return <Sheet open={false} onClose={onEdit}><div /></Sheet>;
  const due = Math.max(0, Math.round(bill.total) - (bill.advance || 0));

  return (
    <Sheet open={open} onClose={onEdit}>
      <div style={{ textAlign: 'center', padding: '6px 0 12px' }}>
        <p className="hint" style={{ margin: 0 }}>Bill print ho gaya — customer ko dikhaiye</p>
        <b className="num" style={{ fontSize: 32, fontFamily: "'Bricolage Grotesque'" }}>{INR(bill.total)}</b>
        <p className="hint" style={{ margin: '4px 0 0' }}>
          {bill.items.length} items · {bill.name}{bill.tableName ? ' · ' + bill.tableName : ''}
          {bill.advance > 0 ? ` · advance ${INR(bill.advance)} · baaki ${INR(due)}` : ''}
        </p>
      </div>
      <ul className="items" style={{ marginBottom: 12 }}>
        {bill.items.map((i, ix) => (
          <li key={ix}><span className="nm"><b>{i.name}</b><small>{i.cat === 'play' && i.meta && i.meta.visitCharged ? `${i.meta.kids} kid · membership visit` : i.cat === 'play' && i.meta ? `${i.meta.minutes} min × ${i.meta.kids}` : `${i.qty} × ${INR(i.rate)}`}</small></span><span className="amt">{INR(i.amount)}</span></li>
        ))}
      </ul>
      <div className="row">
        <button className="btn" style={{ flex: '1 1 120px' }} onClick={onEdit}>✎ Edit karein</button>
        <button className="btn" style={{ flex: '1 1 120px' }} onClick={print}>Dobara print</button>
      </div>
      <button className="btn primary" style={{ width: '100%', padding: 14, marginTop: 10, fontSize: 16 }} onClick={onPay}>
        Payment lein — Cash / UPI / Card →
      </button>
    </Sheet>
  );
}
