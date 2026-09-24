import { useState } from 'react';
import { INR } from '../utils/money';

export default function FoodPanel({ config, items, onAdd, setItems }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const categories = [...new Set(config.menu.map(m => m.category || '').filter(Boolean))];
  const list = config.menu.filter(m =>
    (!q || m.name.toLowerCase().includes(q.toLowerCase())) && (!cat || q || (m.category || '') === cat));

  // Lines with a kitchen note stay separate, so a tap adds to the plain line.
  const bump = (m) => {
    if (m.available === false) return;
    const ex = items.find(i => i.cat === 'food' && i.refId === m.id && !(i.meta && i.meta.note));
    if (ex) setItems(prev => prev.map(i => i.id === ex.id ? { ...i, qty: i.qty + 1, amount: (i.qty + 1) * i.rate } : i));
    else onAdd({ cat: 'food', refId: m.id, name: m.name, qty: 1, rate: m.price, amount: m.price });
  };

  return (
    <>
      <input type="search" placeholder="Item search…" value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 12 }} />
      {categories.length > 0 && !q && (
        <div className="chips" style={{ marginBottom: 12 }}>
          <button className="chip" aria-pressed={!cat} onClick={() => setCat('')}>Sab</button>
          {categories.map(c => <button key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
        </div>
      )}
      <div className="menu">
        {list.map(m => {
          const n = items.filter(i => i.cat === 'food' && i.refId === m.id).reduce((a, i) => a + i.qty, 0);
          const out = m.available === false;
          return (
            <button key={m.id} className={'mi' + (n ? ' on' : '')} disabled={out} style={out ? { opacity: 0.5 } : undefined} onClick={() => bump(m)}>
              <strong>{m.name}</strong><em>{out ? 'Khatam (out of stock)' : INR(m.price)}</em>
              {n > 0 && <span className="qb">{n}</span>}
            </button>
          );
        })}
        {!list.length && <p className="hint">Koi item nahi mila. Setup me menu add kar sakte hain.</p>}
      </div>
    </>
  );
}
