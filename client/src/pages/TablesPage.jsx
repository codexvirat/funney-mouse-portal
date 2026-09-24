import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { useConfig } from '../context/ConfigContext';
import { useToast } from '../context/ToastContext';
import { billSubtotal } from '../utils/bill';
import { INR } from '../utils/money';
import Sheet from '../components/Sheet';
import BookingsCard from '../components/BookingsCard';
import TableDetailPage from './TableDetailPage';
import { useLiveEvents } from '../hooks/useLiveEvents';
import { beep, playAlert } from '../utils/notify';

// Things on a table that need staff attention right now.
function tableAlerts(order) {
  const out = [];
  const play = order.playStart ? playAlert(order.playStart, order.playPlannedMins) : null;
  if (play && play.state !== 'ok') out.push({ key: 'play:' + play.state, text: '⏰ ' + play.text });
  (order.kots || []).filter(k => k.readyAt && !k.servedAt).forEach(k => out.push({ key: 'ready:' + k.no, text: '🍽 Food ready (KOT #' + k.no + ')' }));
  (order.requests || []).filter(r => r.status === 'new').forEach(r => out.push({ key: 'qr:' + r.id, text: '📱 Naya QR order' }));
  return out;
}

const PAY_MODES = ['CASH', 'UPI', 'CARD'];

function OpenTableSheet({ open, table, booking, onClose, onOpened }) {
  const toast = useToast();
  const [adults, setAdults] = useState(1);
  const [kids, setKids] = useState(0);
  const [phone, setPhone] = useState('');
  const [reserveOnly, setReserveOnly] = useState(false);
  const [waiterName, setWaiterName] = useState('');
  const [advance, setAdvance] = useState(0);
  const [advanceMode, setAdvanceMode] = useState('CASH');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      if (booking) {
        setAdults(booking.guests || 1); setKids(0); setPhone(booking.phone || '');
        setReserveOnly(false); setWaiterName(''); setAdvance(booking.advance || 0); setAdvanceMode(booking.advanceMode || 'CASH');
      } else {
        setAdults(1); setKids(0); setPhone(''); setReserveOnly(false);
        setWaiterName(''); setAdvance(0); setAdvanceMode('CASH');
      }
    }
  }, [open, table, booking]);

  if (!table) return <Sheet open={open} onClose={onClose}><div /></Sheet>;

  const save = async () => {
    setBusy(true);
    try {
      let name = booking ? booking.name : 'Walk-in';
      if (!booking && phone.length === 10) {
        try {
          const { data } = await api.get('/customers/' + phone);
          if (data.customer) name = data.customer.name || 'Walk-in';
        } catch (e) { /* new customer, keep default name */ }
      }
      const { data } = await api.post('/table-orders', {
        tableId: table.id, tableName: table.name,
        phone: phone.length === 10 ? phone : '', name, adults, kids,
        reserved: reserveOnly, waiterName,
        advance: reserveOnly ? 0 : advance, advanceMode,
        bookingId: booking ? booking._id : undefined
      });
      onOpened(data.order);
    } catch (e) {
      toast((e.response && e.response.data && e.response.data.message) || 'Table open nahi hua');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 style={{ margin: '0 0 12px', fontSize: 17 }}>{table.name} open karein</h2>
      {booking && (
        <p className="hint" style={{ margin: '0 0 12px' }}>Booking se link ho raha hai: <b>{booking.name}</b>{booking.advance ? ', advance ' + INR(booking.advance) + ' pre-filled' : ''}.</p>
      )}
      {!booking && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <input type="checkbox" checked={reserveOnly} onChange={e => setReserveOnly(e.target.checked)} style={{ width: 18, height: 18 }} />
          <span>Sirf reserve karein (guest abhi nahi aaye)</span>
        </label>
      )}
      <div className="row" style={{ marginBottom: 14 }}>
        <div style={{ flex: '0 0 auto' }}>
          <span className="hint" style={{ display: 'block', marginBottom: 5 }}>Adults</span>
          <div className="stepper"><button onClick={() => setAdults(v => Math.max(0, v - 1))}>−</button><b>{adults}</b><button onClick={() => setAdults(v => v + 1)}>+</button></div>
        </div>
        <div style={{ flex: '0 0 auto' }}>
          <span className="hint" style={{ display: 'block', marginBottom: 5 }}>Kids</span>
          <div className="stepper"><button onClick={() => setKids(v => Math.max(0, v - 1))}>−</button><b>{kids}</b><button onClick={() => setKids(v => v + 1)}>+</button></div>
        </div>
      </div>
      {(adults + kids) > (table.capacity || 999) && (
        <p className="hint" style={{ color: 'var(--berry)', margin: '0 0 12px' }}>Table ki seating {table.capacity} hai — guests zyada hain.</p>
      )}
      <label className="f"><span>Mobile number (optional)</span>
        <input type="tel" inputMode="numeric" maxLength={10} placeholder="10 digit number"
          value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} />
      </label>
      <label className="f"><span>Waiter (optional)</span>
        <input type="text" placeholder="Waiter ka naam" value={waiterName} onChange={e => setWaiterName(e.target.value)} />
      </label>
      {!reserveOnly && (
        <div className="row">
          <label className="f" style={{ margin: 0, flex: '1 1 130px' }}><span>Advance (optional)</span>
            <input type="number" min="0" value={advance || ''} placeholder="0" onChange={e => setAdvance(Number(e.target.value) || 0)} />
          </label>
          {advance > 0 && (
            <div style={{ flex: '1 1 160px' }}>
              <span className="hint" style={{ display: 'block', marginBottom: 5 }}>Mode</span>
              <div className="seg">
                {PAY_MODES.map(m => <button key={m} aria-pressed={advanceMode === m} onClick={() => setAdvanceMode(m)}>{m}</button>)}
              </div>
            </div>
          )}
        </div>
      )}
      <button className="btn primary" style={{ width: '100%', padding: 14, marginTop: 14 }} disabled={busy} onClick={save}>
        {busy ? 'Opening…' : (reserveOnly ? 'Reserve karein' : 'Open table')}
      </button>
    </Sheet>
  );
}

export default function TablesPage() {
  const { config } = useConfig();
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [pickTable, setPickTable] = useState(null);
  const [activeBooking, setActiveBooking] = useState(null);
  const [, setTick] = useState(0);
  const seenAlerts = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/table-orders');
      setOrders(data.orders);
    } catch (e) { /* ignore transient poll errors */ }
  }, []);

  useLiveEvents(['tables'], load);

  useEffect(() => {
    load();
    const poll = setInterval(load, 20000);
    const clock = setInterval(() => setTick(t => t + 1), 20000);
    return () => { clearInterval(poll); clearInterval(clock); };
  }, [load]);

  // Beep + toast once for each new alert (not for ones already showing when
  // the page opened).
  useEffect(() => {
    const now = new Set();
    const fresh = [];
    orders.forEach(o => tableAlerts(o).forEach(a => {
      const k = o._id + ':' + a.key;
      now.add(k);
      if (seenAlerts.current && !seenAlerts.current.has(k)) fresh.push(o.tableName + ' — ' + a.text);
    }));
    if (fresh.length) { beep(); toast(fresh[0]); }
    seenAlerts.current = now;
  });

  if (!config) return <p className="hint">Loading…</p>;

  const tables = config.tables || [];
  const activeOrder = openId ? orders.find(o => o._id === openId) : null;
  const occupiedIds = new Set(orders.map(o => o.tableId));
  const freeTables = tables.filter(t => !occupiedIds.has(t.id));

  if (activeOrder) {
    return (
      <TableDetailPage
        order={activeOrder}
        config={config}
        freeTables={freeTables}
        otherOrders={orders.filter(o => o._id !== activeOrder._id)}
        onSyncOrder={(updated) => setOrders(prev => prev.map(o => o._id === updated._id ? updated : o))}
        onBack={() => setOpenId(null)}
        onClosed={() => { setOpenId(null); load(); }}
        onTransferred={(updated) => { setOrders(prev => prev.map(o => o._id === updated._id ? updated : o)); setOpenId(null); }}
        onMerged={() => { setOpenId(null); load(); }}
      />
    );
  }

  return (
    <>
      <BookingsCard tables={tables} freeTables={freeTables}
        onUseBooking={(b) => { setActiveBooking(b); toast('Ab kisi free table par tap karein — ' + b.name + ' ke liye'); }}
        onAssigned={(created) => setOrders(prev => [...prev, ...created])} />

      {activeBooking && (
        <div className="card" style={{ borderColor: 'var(--accent)' }}>
          <div className="bd" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 1 }}>Booking select hai: <b>{activeBooking.name}</b> — ab koi free table chunein.</span>
            <button className="btn sm ghost" onClick={() => setActiveBooking(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="hd"><h2>Tables</h2><div className="spacer"></div><span className="hint">{orders.filter(o => !o.reserved).length} occupied / {tables.length}</span></div>
        <div className="bd">
          {!tables.length && (
            <div className="empty"><b>Koi table set nahi hai</b>Setup me tables add kar dijiye.</div>
          )}
          <div className="menu">
            {tables.map(t => {
              const order = orders.find(o => o.tableId === t.id);
              const mins = order ? Math.max(0, Math.round((Date.now() - new Date(order.openedAt).getTime()) / 60000)) : 0;
              const state = !order ? 'free' : (order.reserved ? 'reserved' : 'busy');
              const alerts = order ? tableAlerts(order) : [];
              return (
                <button key={t.id} className={'mi tbltile ' + state + (alerts.length ? ' alert' : '')}
                  onClick={() => order ? setOpenId(order._id) : setPickTable(t)}>
                  <strong>{t.name}</strong>
                  {!order && <em>Free{t.capacity ? ' · seats ' + t.capacity : ''}</em>}
                  {order && order.reserved && (
                    <em>Reserved{order.name && order.name !== 'Walk-in' ? ' · ' + order.name : ''}</em>
                  )}
                  {order && !order.reserved && (
                    <em>
                      {order.adults + order.kids} guest{(order.adults + order.kids) === 1 ? '' : 's'}
                      {order.kids ? ' · ' + order.kids + ' kid' + (order.kids > 1 ? 's' : '') : ''}<br />
                      {Math.floor(mins / 60)}h {String(mins % 60).padStart(2, '0')}m · {INR(billSubtotal(order.items))}
                    </em>
                  )}
                  {alerts.map(a => <b key={a.key} className="tblalert">{a.text}</b>)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <OpenTableSheet open={!!pickTable} table={pickTable} booking={activeBooking} onClose={() => setPickTable(null)}
        onOpened={(order) => { setOrders(prev => [...prev, order]); setPickTable(null); setActiveBooking(null); setOpenId(order._id); }} />
    </>
  );
}
