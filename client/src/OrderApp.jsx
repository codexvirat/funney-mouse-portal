import axios from 'axios';
import { useEffect, useState } from 'react';
import { INR } from './utils/money';

const publicApi = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api' });

function errMsg(e, fallback) {
  return (e.response && e.response.data && e.response.data.message) || fallback;
}

// Public page a customer reaches by scanning the QR sticker on their table:
// /order/<tableId>?t=<token>. No login; the order goes to staff for approval.
export default function OrderApp() {
  const tableId = decodeURIComponent(window.location.pathname.replace(/^\/order\//, '').replace(/\/+$/, ''));
  const token = new URLSearchParams(window.location.search).get('t') || '';
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [cart, setCart] = useState({});
  const [notes, setNotes] = useState({});
  const [cat, setCat] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null);

  const load = () => {
    publicApi.get('/public/table/' + encodeURIComponent(tableId), { params: { t: token } })
      .then(({ data }) => { setInfo(data); setError(''); })
      .catch(e => setError(errMsg(e, 'Menu load nahi hua')));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error && !info) {
    return <div className="loginWrap"><div className="card loginCard" style={{ textAlign: 'center' }}><div style={{ fontSize: 34 }}>🧀</div><h2>{error}</h2><p className="hint">Staff ko bulaiye.</p></div></div>;
  }
  if (!info) return <p className="hint" style={{ textAlign: 'center', marginTop: 40 }}>Loading…</p>;

  const cats = [...new Set(info.menu.map(m => m.category).filter(Boolean))];
  const list = info.menu.filter(m => !cat || m.category === cat);
  const lines = info.menu.filter(m => cart[m.id] > 0);
  const total = lines.reduce((a, m) => a + m.price * cart[m.id], 0);
  const count = lines.reduce((a, m) => a + cart[m.id], 0);
  const bump = (id, d) => setCart(c => ({ ...c, [id]: Math.max(0, Math.min(20, (c[id] || 0) + d)) }));

  const submit = async () => {
    setBusy(true);
    try {
      await publicApi.post(`/public/table/${encodeURIComponent(tableId)}/order`, {
        t: token, name,
        items: lines.map(m => ({ id: m.id, qty: cart[m.id], note: notes[m.id] || '' }))
      });
      setSent({ count, total });
      setCart({}); setNotes({});
    } catch (e) {
      setError(errMsg(e, 'Order nahi gaya — staff ko bulaiye'));
      load();
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="loginWrap"><div className="card loginCard" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>✅</div>
        <h2 style={{ margin: '8px 0 4px' }}>Order bhej diya!</h2>
        <p className="hint">{sent.count} items · {INR(sent.total)}. Staff confirm karke kitchen me bhejega.</p>
        <button className="btn primary" style={{ width: '100%', marginTop: 12 }} onClick={() => { setSent(null); setError(''); }}>Aur order karein</button>
      </div></div>
    );
  }

  return (
    <>
      <header className="topbar"><div className="wrap">
        <div className="mark" aria-hidden="true" style={{ fontSize: 20 }}>🧀</div>
        <div className="brand"><b>{info.shopName}</b><span>{info.tableName} · Menu</span></div>
      </div></header>
      <main className="wrap" style={{ paddingTop: 14, paddingBottom: 120 }}>
        {!info.open && (
          <div className="card" style={{ borderColor: 'var(--berry)' }}><div className="bd">
            <b>Table abhi open nahi hai.</b> <span className="hint">Menu dekh sakte hain — order ke liye staff se table open karwaiye.</span>
          </div></div>
        )}
        {error && <div className="card" style={{ borderColor: 'var(--berry)' }}><div className="bd" style={{ color: 'var(--berry)' }}>{error}</div></div>}
        {cats.length > 0 && (
          <div className="chips" style={{ marginBottom: 12 }}>
            <button className="chip" aria-pressed={!cat} onClick={() => setCat('')}>Sab</button>
            {cats.map(c => <button key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
          </div>
        )}
        <div className="card"><div className="bd">
          <ul className="items">
            {list.map(m => (
              <li key={m.id} style={{ flexWrap: 'wrap' }}>
                <span className="nm"><b>{m.name}</b><small>{INR(m.price)}</small></span>
                {cart[m.id] > 0 ? (
                  <div className="stepper"><button onClick={() => bump(m.id, -1)}>−</button><b>{cart[m.id]}</b><button onClick={() => bump(m.id, 1)}>+</button></div>
                ) : (
                  <button className="btn sm dark" disabled={!info.open} onClick={() => bump(m.id, 1)}>Add</button>
                )}
                {cart[m.id] > 0 && (
                  <input type="text" maxLength={80} placeholder="Note (e.g. less spicy)" value={notes[m.id] || ''}
                    onChange={e => setNotes(n => ({ ...n, [m.id]: e.target.value }))} style={{ flex: '1 1 100%', padding: '8px 10px' }} />
                )}
              </li>
            ))}
          </ul>
          {!list.length && <p className="hint">Abhi koi item available nahi.</p>}
        </div></div>
        {count > 0 && (
          <label className="f"><span>Aapka naam (optional)</span>
            <input type="text" maxLength={40} value={name} onChange={e => setName(e.target.value)} /></label>
        )}
      </main>
      {count > 0 && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, background: 'var(--surface)', borderTop: '1px solid var(--line)', padding: '12px 14px calc(12px + env(safe-area-inset-bottom))' }}>
          <div className="wrap" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 0 }}>
            <span style={{ flex: 1 }}><b>{count} items</b><br /><span className="hint">{INR(total)} + GST</span></span>
            <button className="btn primary" style={{ padding: '13px 20px' }} disabled={busy || !info.open} onClick={submit}>{busy ? 'Bhej rahe…' : 'Order bhejein'}</button>
          </div>
        </div>
      )}
    </>
  );
}
