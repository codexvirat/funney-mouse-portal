import { useState } from 'react';
import { INR } from '../utils/money';

export default function FoodPanel({ config, items, onAdd, setItems }) {
  const [q, setQ] = useState('');
  const list = config.menu.filter(m => !q || m.name.toLowerCase().includes(q.toLowerCase()));

  const bump = (m) => {
    const ex = items.find(i => i.cat === 'food' && i.refId === m.id);
    if (ex) setItems(prev => prev.map(i => i.id === ex.id ? { ...i, qty: i.qty + 1, amount: (i.qty + 1) * i.rate } : i));
    else onAdd({ cat: 'food', refId: m.id, name: m.name, qty: 1, rate: m.price, amount: m.price });
  };

  return (
    <>
      <input type="search" placeholder="Item search…" value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 12 }} />
      <div className="menu">
        {list.map(m => {
          const n = items.filter(i => i.cat === 'food' && i.refId === m.id).reduce((a, i) => a + i.qty, 0);
          return (
            <button key={m.id} className={'mi' + (n ? ' on' : '')} onClick={() => bump(m)}>
              <strong>{m.name}</strong><em>{INR(m.price)}</em>
              {n > 0 && <span className="qb">{n}</span>}
            </button>
          );
        })}
        {!list.length && <p className="hint">Koi item nahi mila. Setup me menu add kar sakte hain.</p>}
      </div>
    </>
  );
}
