import { useEffect, useState } from 'react';
import Sheet from './Sheet';
import { INR } from '../utils/money';

// Food and socks can be split by quantity (2 of 4 pizzas); play/membership
// lines go whole because their qty is the kids count tied to meta.
const byQty = (i) => i.cat === 'food' || i.cat === 'socks';

// Pick which lines go on a separate bill — e.g. play area and food billed
// apart, or each guest of a group paying only for what they ate. Hands the
// picked lines back via onNext; the caller previews the total and takes
// payment. Unpicked lines stay on the running bill.
export default function SplitSheet({ open, items, onClose, onNext }) {
  const [sel, setSel] = useState({}); // item id -> qty picked
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setSel({}); setPhone(''); setName(''); }
  }, [open]);

  const pickCats = (cats) => setSel(Object.fromEntries(items.filter(i => cats.includes(i.cat)).map(i => [i.id, i.qty])));
  const toggle = (i) => setSel(s => {
    const n = { ...s };
    if (n[i.id]) delete n[i.id]; else n[i.id] = i.qty;
    return n;
  });
  const bump = (i, d) => setSel(s => {
    const q = Math.max(0, Math.min(i.qty, (s[i.id] || 0) + d));
    const n = { ...s };
    if (q) n[i.id] = q; else delete n[i.id];
    return n;
  });

  const picked = items.filter(i => sel[i.id]).map(i => ({ ...i, qty: sel[i.id], amount: sel[i.id] * i.rate }));
  const sub = picked.reduce((a, i) => a + i.amount, 0);
  const hasCat = (cats) => items.some(i => cats.includes(i.cat));
  const phoneBad = phone.length > 0 && phone.length !== 10;

  const next = async () => {
    setBusy(true);
    try {
      const picks = items.map((i, index) => (sel[i.id] ? { index, qty: sel[i.id], name: i.name } : null)).filter(Boolean);
      await onNext({ picked, picks, phone, name: name.trim() });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 style={{ margin: '0 0 4px', fontSize: 17 }}>Alag bill banayein</h2>
      <p className="hint" style={{ margin: '0 0 12px' }}>
        Jo items is bill me chahiye unhe select karein — baaki bill me hi rahenge. Play aur food alag, ya group me har koi apna bill.
      </p>

      <div className="chips" style={{ marginBottom: 10 }}>
        {hasCat(['play', 'socks']) && <button className="chip" onClick={() => pickCats(['play', 'socks'])}>Sirf play area</button>}
        {hasCat(['food']) && <button className="chip" onClick={() => pickCats(['food'])}>Sirf food</button>}
        <button className="chip" onClick={() => setSel({})}>Clear</button>
      </div>

      <div>
        {items.map(i => (
          <div className="splitrow" key={i.id}>
            <input type="checkbox" checked={!!sel[i.id]} onChange={() => toggle(i)} />
            <span style={{ flex: 1, minWidth: 0 }} onClick={() => toggle(i)}>
              <b>{i.name}</b><br />
              <span className="hint">{i.qty} × {INR(i.rate)}{i.meta && i.meta.note ? ' · ' + i.meta.note : ''}</span>
            </span>
            {byQty(i) && i.qty > 1 && sel[i.id] ? (
              <div className="stepper" style={{ flex: '0 0 auto' }}>
                <button onClick={() => bump(i, -1)}>−</button><b>{sel[i.id]}</b><button onClick={() => bump(i, 1)}>+</button>
              </div>
            ) : null}
            <b className="num" style={{ flex: '0 0 auto' }}>{INR(sel[i.id] ? sel[i.id] * i.rate : i.amount)}</b>
          </div>
        ))}
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <label className="f" style={{ margin: 0, flex: '1 1 140px' }}><span>Naam (optional)</span>
          <input value={name} placeholder="Walk-in" onChange={e => setName(e.target.value)} />
        </label>
        <label className="f" style={{ margin: 0, flex: '1 1 140px' }}><span>Phone (optional)</span>
          <input inputMode="numeric" maxLength={10} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} />
        </label>
      </div>
      {phoneBad && <p className="hint" style={{ color: 'var(--berry)', margin: '6px 0 0' }}>Phone 10 digit ka hona chahiye</p>}

      <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
        <button className="btn primary" style={{ padding: 15, fontSize: 16 }} disabled={!picked.length || phoneBad || busy} onClick={next}>
          {busy ? 'Wait…' : `Is bill ka payment · ${INR(sub)}`}
        </button>
        <p className="hint" style={{ margin: 0, textAlign: 'center' }}>GST / member discount payment screen pe jud jayega.</p>
        <button className="btn ghost" onClick={onClose}>Back</button>
      </div>
    </Sheet>
  );
}
