import { useEffect, useState } from 'react';
import api from '../api/client';
import { useConfig } from '../context/ConfigContext';
import { useToast } from '../context/ToastContext';
import { INR } from '../utils/money';
import { esc } from '../utils/html';
import { uid } from '../utils/uid';
import Sheet from './Sheet';
import FoodPanel from './FoodPanel';

function kotSlipHTML(booking, lines, shopName) {
  const rows = lines.map(l => `<tr><td style="font-size:14px">${esc(l.name)}</td><td class="rt" style="font-size:14px"><b>×${l.qty}</b></td></tr>`).join('');
  const time = new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return `<h3>${esc(shopName)} — KOT</h3>
    <div style="text-align:center;font-size:16px;font-weight:bold">PARTY: ${esc((booking.party && booking.party.childName) || booking.name)}</div>
    <div style="text-align:center;font-size:11px">Extra order · ${time}</div><hr>
    <table>${rows}</table>`;
}

// Items ordered during a party on top of the finalised menu. Saved on the
// booking and billed on the party's food bill; new lines can go to the
// kitchen as a KOT slip.
export default function PartyExtrasSheet({ booking, onClose, onSaved }) {
  const { config } = useConfig();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [custom, setCustom] = useState({ name: '', rate: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (booking) {
      setItems(((booking.party && booking.party.extras) || []).map(x => ({ id: uid(), cat: 'food', ...x, amount: x.qty * x.rate })));
      setCustom({ name: '', rate: '' });
    }
  }, [booking]);

  if (!booking || !config) return <Sheet open={false} onClose={onClose}><div /></Sheet>;

  const shopName = config.shopName || 'Funny Mouse';
  const p = booking.party;
  const pct = (Number(p.foodGst) || 0) + (Number(p.serviceCharge) || 0);
  const sub = items.reduce((a, i) => a + i.qty * i.rate, 0);
  // Per line, rounded — same as the party food bill (calcParty).
  const withPct = items.reduce((a, i) => a + Math.round(i.qty * i.rate * (1 + pct / 100)), 0);
  const pending = items.filter(i => i.qty > (i.kotQty || 0)).map(i => ({ name: i.name, qty: i.qty - (i.kotQty || 0) }));

  const setQty = (id, qty) => setItems(prev => prev
    .map(i => i.id === id ? { ...i, qty, kotQty: Math.min(i.kotQty || 0, qty), amount: qty * i.rate } : i)
    .filter(i => i.qty > 0));

  const addCustom = () => {
    const rate = Number(custom.rate) || 0;
    if (!custom.name.trim() || rate <= 0) { toast('Item ka naam aur rate daaliye'); return; }
    setItems(prev => [...prev, { id: uid(), cat: 'food', refId: null, name: custom.name.trim(), qty: 1, rate, amount: rate, kotQty: 0 }]);
    setCustom({ name: '', rate: '' });
  };

  const save = async (printKot) => {
    setBusy(true);
    try {
      if (printKot && pending.length) {
        const area = document.getElementById('printarea');
        if (area) area.innerHTML = kotSlipHTML(booking, pending, shopName);
        window.print();
      }
      const extras = items.map(i => ({ refId: i.refId || null, name: i.name, qty: i.qty, rate: i.rate, kotQty: printKot ? i.qty : (i.kotQty || 0) }));
      const { data } = await api.put(`/bookings/${booking._id}/extras`, { extras });
      toast(printKot && pending.length ? 'KOT print + extra save ho gaya' : 'Extra order save ho gaya');
      onSaved(data.booking);
    } catch (e) {
      toast((e.response && e.response.data && e.response.data.message) || 'Save nahi hua');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open onClose={onClose} wide>
      <h2 style={{ margin: '0 0 4px', fontSize: 17 }}>Extra order — {p.childName || booking.name}</h2>
      <p className="hint" style={{ margin: '0 0 12px' }}>Final menu ke upar jo bhi extra mangaya, yahan jodiye. Ye party ke Food bill me {pct}% ke saath judega.</p>

      <FoodPanel config={config} items={items} onAdd={it => setItems(prev => [...prev, { id: uid(), kotQty: 0, ...it }])} setItems={setItems} />

      <div className="row" style={{ marginTop: 12, alignItems: 'flex-end' }}>
        <label className="f" style={{ flex: '2 1 160px', margin: 0 }}><span>Menu me nahi hai? Item ka naam</span>
          <input type="text" value={custom.name} onChange={e => setCustom(c => ({ ...c, name: e.target.value }))} /></label>
        <label className="f" style={{ flex: '1 1 90px', margin: 0 }}><span>Rate</span>
          <input type="number" min="0" value={custom.rate} onChange={e => setCustom(c => ({ ...c, rate: e.target.value }))} /></label>
        <button className="btn" style={{ flex: '0 0 auto' }} onClick={addCustom}>+ Add</button>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="hd"><h2>Extra items</h2><div className="spacer"></div><b className="num">{INR(withPct)}</b></div>
        <div className="bd">
          {!items.length && <p className="hint" style={{ margin: 0 }}>Abhi koi extra nahi. Upar menu se tap karein.</p>}
          {items.map(i => (
            <div className="splitrow" key={i.id}>
              <span style={{ flex: 1, minWidth: 0 }}>{i.name}<br />
                <span className="hint">{INR(i.rate)} each{i.kotQty ? ` · ${i.kotQty} kitchen gaya` : ''}{i.qty > (i.kotQty || 0) ? ` · ${i.qty - (i.kotQty || 0)} naya` : ''}</span></span>
              <div className="stepper"><button onClick={() => setQty(i.id, i.qty - 1)}>−</button><b>{i.qty}</b><button onClick={() => setQty(i.id, i.qty + 1)}>+</button></div>
              <b className="num" style={{ minWidth: 70, textAlign: 'right' }}>{INR(i.qty * i.rate)}</b>
            </div>
          ))}
          {items.length > 0 && <p className="hint" style={{ margin: '10px 0 0' }}>Subtotal {INR(sub)} + {pct}% = <b>{INR(withPct)}</b></p>}
        </div>
      </div>

      <div className="row">
        <button className="btn" disabled={busy} onClick={() => save(false)}>Sirf save karein</button>
        <button className="btn primary" disabled={busy || !pending.length} onClick={() => save(true)}>
          {pending.length ? `KOT print + save (${pending.reduce((a, l) => a + l.qty, 0)} item)` : 'KOT — sab bhej diya'}</button>
      </div>
    </Sheet>
  );
}
