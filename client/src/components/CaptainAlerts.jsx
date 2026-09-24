import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { askNotifyPermission, beep, notifyPermission, registerNotifyWorker, systemNotify } from '../utils/notify';

// Captain login: food that's ready on *my* tables (and new QR orders there),
// with a phone notification the moment the kitchen marks a KOT ready.
// `hidden` keeps just the notifications running (e.g. while a table is open).
export default function CaptainAlerts({ me, orders, onSync, hidden }) {
  const toast = useToast();
  const [perm, setPerm] = useState(notifyPermission());
  const seen = useRef(null);

  useEffect(() => { registerNotifyWorker(); }, []);

  const mine = orders.filter(o => o.waiterUser === me);
  const ready = [];
  const qr = [];
  mine.forEach(o => {
    (o.kots || []).filter(k => k.readyAt && !k.servedAt).forEach(k => ready.push({ o, k }));
    (o.requests || []).filter(r => r.status === 'new').forEach(r => qr.push({ o, r }));
  });

  // Notify once per ready KOT / QR order (not for ones already there when
  // the page opened).
  useEffect(() => {
    const now = new Set();
    const fresh = [];
    ready.forEach(({ o, k }) => {
      const key = 'ready:' + o._id + ':' + k.no;
      now.add(key);
      if (seen.current && !seen.current.has(key)) fresh.push(['🍽 ' + o.tableName + ' — food ready', 'KOT #' + k.no + ': ' + k.items.map(i => i.name + ' ×' + i.qty).join(', '), key]);
    });
    qr.forEach(({ o, r }) => {
      const key = 'qr:' + r.id;
      now.add(key);
      if (seen.current && !seen.current.has(key)) fresh.push(['📱 ' + o.tableName + ' — naya QR order', r.items.map(i => i.name + ' ×' + i.qty).join(', '), key]);
    });
    fresh.forEach(([title, body, tag]) => systemNotify(title, body, tag));
    if (fresh.length) { beep(); toast(fresh[0][0]); }
    seen.current = now;
  });

  const served = async (o, k) => {
    try {
      const { data } = await api.post(`/table-orders/${o._id}/kot/${k.no}/served`);
      onSync(data.order);
    } catch (e) {
      toast('Update nahi hua');
    }
  };

  const enable = async () => setPerm(await askNotifyPermission());

  if (hidden) return null;

  return (
    <div className="card" style={ready.length ? { borderColor: 'var(--mint)' } : undefined}>
      <div className="hd"><h2>Mere tables</h2><div className="spacer"></div>
        <span className="hint">{mine.length} table{mine.length === 1 ? '' : 's'}</span>
      </div>
      <div className="bd">
        {perm !== 'granted' && perm !== 'unsupported' && (
          <div className="row" style={{ alignItems: 'center', marginBottom: 12, padding: 10, borderRadius: 12, background: 'var(--accent-soft)' }}>
            <span className="hint" style={{ flex: '2 1 180px' }}>{perm === 'denied'
              ? 'Notifications block hain — browser settings me is site ke liye Notifications "Allow" karein.'
              : 'Food ready hone par phone par notification ke liye ek baar allow karein.'}</span>
            {perm !== 'denied' && <button className="btn sm dark" style={{ flex: '0 0 auto' }} onClick={enable}>🔔 Notifications on karein</button>}
          </div>
        )}
        {!ready.length && !qr.length && (
          <p className="hint" style={{ margin: 0 }}>{mine.length ? 'Abhi koi food ready nahi. Kitchen "Ready" karega to yahan aur phone par alert aayega.' : 'Aapko abhi koi table assign nahi hai. Table kholte waqt Waiter me aapka naam hona chahiye.'}</p>
        )}
        {ready.map(({ o, k }) => (
          <div className="sess" key={o._id + k.no} style={{ borderColor: 'var(--mint)', background: 'var(--mint-soft)' }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <b>🍽 {o.tableName} — KOT #{k.no} ready</b><br />
              <span className="hint">{k.items.map(i => i.name + ' ×' + i.qty + (i.note ? ' (' + i.note + ')' : '')).join(', ')}</span>
            </span>
            <button className="btn sm dark" onClick={() => served(o, k)}>Serve ho gaya</button>
          </div>
        ))}
        {qr.map(({ o, r }) => (
          <div className="sess" key={r.id} style={{ borderColor: 'var(--grape)', background: 'var(--grape-soft)' }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <b>📱 {o.tableName} — naya QR order</b><br />
              <span className="hint">{r.items.map(i => i.name + ' ×' + i.qty).join(', ')} · table kholke Accept karein</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
