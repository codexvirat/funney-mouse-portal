import { useEffect, useState } from 'react';
import Sheet from './Sheet';
import { INR } from '../utils/money';

const MODES = [
  { key: 'UPI', cls: 'upi', label: 'UPI' },
  { key: 'CASH', cls: 'cash', label: 'Cash' },
  { key: 'CARD', cls: 'card', label: 'Card' },
  { key: 'DUE', cls: 'due', label: 'Udhaar / Due' }
];

export default function PaymentSheet({ open, total, onClose, onSave }) {
  const [pay, setPay] = useState({ UPI: 0, CASH: 0, CARD: 0, DUE: 0 });
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) setPay({ UPI: 0, CASH: 0, CARD: 0, DUE: 0 }); }, [open]);

  const paid = pay.UPI + pay.CASH + pay.CARD + pay.DUE;
  const left = total - paid;

  const tap = (k) => {
    const l = total - (pay.UPI + pay.CASH + pay.CARD + pay.DUE);
    setPay(p => ({ ...p, [k]: l > 0 ? p[k] + l : 0 }));
  };

  const save = async () => {
    setBusy(true);
    try {
      await onSave(pay);
    } catch (e) {
      alert((e.response && e.response.data && e.response.data.message) || 'Bill save nahi hua');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: 17 }}>Payment</h2><div className="spacer" style={{ flex: 1 }}></div>
        <b className="num" style={{ fontSize: 26, fontFamily: "'Bricolage Grotesque'" }}>{INR(total)}</b>
      </div>
      <p className="hint" style={{ margin: '0 0 14px' }}>
        {left > 0 ? `Baaki ${INR(left)} — mode par tap karein` : left < 0 ? 'Amount zyada hai, clear karke dobara' : 'Pura amount split ho gaya'}
      </p>
      <div className="paytiles">
        {MODES.map(m => (
          <button key={m.key} className={`pt ${m.cls} ${pay[m.key] > 0 ? 'on' : ''}`} onClick={() => tap(m.key)}>
            <b>{m.label}</b><span>{pay[m.key] > 0 ? INR(pay[m.key]) : 'Tap for ' + INR(Math.max(0, left))}</span>
          </button>
        ))}
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn ghost sm" style={{ flex: '0 0 auto' }} onClick={() => setPay({ UPI: 0, CASH: 0, CARD: 0, DUE: 0 })}>Clear split</button>
      </div>
      <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
        <button className="btn primary" style={{ padding: 15, fontSize: 16 }} disabled={left !== 0 || busy} onClick={save}>
          {busy ? 'Saving…' : 'Save bill'}
        </button>
        <button className="btn ghost" onClick={onClose}>Back</button>
      </div>
    </Sheet>
  );
}
