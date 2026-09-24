import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { useConfig } from '../context/ConfigContext';
import { useToast } from '../context/ToastContext';
import { useLiveEvents } from '../hooks/useLiveEvents';
import { kotHTML, pendingKot, printKotSlip } from '../utils/kot';
import { beep } from '../utils/notify';
import { tstr } from '../utils/date';

function pendingQty(order) {
  return pendingKot(order).reduce((a, i) => a + i.qty, 0);
}

function kotLine(i) {
  return i.name + ' ×' + i.qty + (i.note ? ' (' + i.note + ')' : '');
}

function MenuAvailability({ config, reload }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const menu = (config && config.menu) || [];
  const outCount = menu.filter(m => m.available === false).length;

  const toggle = async (m) => {
    try {
      await api.patch(`/config/menu/${m.id}/availability`, { available: m.available === false });
      await reload();
      toast(m.name + (m.available === false ? ' wapas available' : ' out of stock'));
    } catch (e) {
      toast('Update nahi hua');
    }
  };

  return (
    <div className="card">
      <div className="hd"><h2>Menu — kya khatam hai?</h2><div className="spacer"></div>
        {outCount > 0 && <span className="badge warn">{outCount} khatam</span>}
        <button className="btn sm ghost" onClick={() => setOpen(v => !v)}>{open ? 'Band karein' : 'Dikhayein'}</button>
      </div>
      {open && (
        <div className="bd">
          <p className="hint" style={{ margin: '0 0 10px' }}>Jo item khatam ho, us par tap karein — staff aur QR menu me wo order nahi ho payega.</p>
          <div className="menu">
            {menu.map(m => (
              <button key={m.id} className={'mi' + (m.available === false ? ' on' : '')} onClick={() => toggle(m)}>
                <strong>{m.name}</strong><em>{m.available === false ? 'Khatam — tap to restore' : 'Available'}</em>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Kitchen login: every open table with food not yet sent to the kitchen,
// a per-table button to print its KOT, and a "Ready" button once cooked so
// the floor staff know to serve it.
export default function KitchenPage() {
  const { config, reload } = useConfig();
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [showSent, setShowSent] = useState({});
  const lastPending = useRef(null);
  const shopName = (config && config.shopName) || 'Funny Mouse';

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/table-orders');
      setOrders(data.orders.filter(o => !o.reserved));
    } catch (e) { /* ignore transient poll errors */ }
  }, []);

  useLiveEvents(['tables'], load);

  useEffect(() => {
    load();
    const poll = setInterval(load, 15000);
    return () => clearInterval(poll);
  }, [load]);

  const totalPending = orders.reduce((a, o) => a + pendingQty(o), 0);
  useEffect(() => {
    if (lastPending.current !== null && totalPending > lastPending.current) beep();
    lastPending.current = totalPending;
  }, [totalPending]);

  const replace = (order) => setOrders(prev => prev.map(o => o._id === order._id ? order : o));

  const sendKot = async (order) => {
    const { data } = await api.post(`/table-orders/${order._id}/kot`);
    replace(data.order);
    return data;
  };

  const printOne = async (order) => {
    setBusyId(order._id);
    try {
      const { order: updated, kot } = await sendKot(order);
      printKotSlip(updated, kot, shopName);
      toast(order.tableName + ' — KOT #' + kot.no + ' print ho gaya');
    } catch (e) {
      toast((e.response && e.response.data && e.response.data.message) || 'KOT print nahi hua');
      load();
    } finally {
      setBusyId(null);
    }
  };

  // One print job with a page break between tables, instead of one dialog per table.
  const printAll = async () => {
    setBusyId('all');
    const slips = [];
    for (const o of orders.filter(x => pendingQty(x) > 0)) {
      try {
        const { order: updated, kot } = await sendKot(o);
        slips.push(kotHTML(updated, kot, shopName));
      } catch (e) { /* someone else printed it meanwhile */ }
    }
    setBusyId(null);
    if (!slips.length) { toast('Koi naya KOT nahi hai'); load(); return; }
    const area = document.getElementById('printarea');
    if (area) area.innerHTML = slips.join('<div style="page-break-after:always"></div>');
    window.print();
    toast(slips.length + ' KOT print ho gaye');
  };

  const markReady = async (order, kot) => {
    try {
      const { data } = await api.post(`/table-orders/${order._id}/kot/${kot.no}/ready`);
      replace(data.order);
      toast(order.tableName + ' — KOT #' + kot.no + ' ready');
    } catch (e) {
      toast('Update nahi hua');
    }
  };

  const cooking = (o) => (o.kots || []).filter(k => !k.readyAt);
  const needsWork = (o) => pendingQty(o) > 0 || cooking(o).length > 0;
  const sorted = [...orders].sort((a, b) => needsWork(b) - needsWork(a) || a.openedAt.localeCompare(b.openedAt));
  const cookingCount = orders.reduce((a, o) => a + cooking(o).length, 0);

  return (
    <>
      <div className="card">
        <div className="hd"><h2>Kitchen orders</h2><div className="spacer"></div>
          <button className="btn sm primary" disabled={!totalPending || busyId === 'all'} onClick={printAll}>
            {busyId === 'all' ? 'Printing…' : 'Sab KOT print karein' + (totalPending ? ` (${totalPending})` : '')}
          </button>
        </div>
        <div className="bd">
          <p className="hint" style={{ margin: 0 }}>
            {orders.length} table open · {orders.filter(o => pendingQty(o) > 0).length} table ka naya order · {cookingCount} KOT ban rahe hain.
          </p>
        </div>
      </div>

      <MenuAvailability config={config} reload={reload} />

      {!orders.length && <div className="empty"><b>Koi table open nahi hai</b>Naye orders yahan dikhenge.</div>}

      {sorted.map(o => {
        const pending = pendingKot(o);
        const inKitchen = cooking(o);
        const done = (o.kots || []).filter(k => k.readyAt);
        return (
          <div className="card" key={o._id} style={pending.length ? { borderColor: 'var(--berry)' } : undefined}>
            <div className="hd">
              <h2>{o.tableName}</h2>
              <span className="hint">
                {' '}· {o.adults + o.kids} guests{o.waiterName ? ' · ' + o.waiterName : ''} · {tstr(o.openedAt)}
              </span>
              <div className="spacer"></div>
              <button className="btn sm dark" disabled={!pending.length || busyId === o._id} onClick={() => printOne(o)}>
                {busyId === o._id ? 'Printing…' : 'Print KOT'}
              </button>
            </div>
            <div className="bd">
              {pending.length ? (
                <table className="tb">
                  <tbody>
                    {pending.map(i => (
                      <tr key={i.key}>
                        <td><b>{i.name}</b>{i.note && <><br /><b style={{ color: 'var(--berry)', fontSize: 13 }}>» {i.note}</b></>}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}><b>× {i.qty}</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="hint" style={{ margin: 0 }}>Koi naya item print ke liye pending nahi.</p>}

              {inKitchen.map(k => (
                <div key={k.no} className="sess" style={{ marginTop: 9, borderColor: 'var(--accent)', background: 'var(--accent-soft)' }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b>KOT #{k.no} ban raha hai</b> <span className="hint">· {tstr(k.at)}</span><br />
                    <span className="hint">{k.items.map(kotLine).join(', ')}</span>
                  </span>
                  <button className="btn sm primary" onClick={() => markReady(o, k)}>Ready ✓</button>
                  <button className="btn sm ghost" onClick={() => printKotSlip(o, k, shopName, true)}>Reprint</button>
                </div>
              ))}

              {done.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <button className="btn sm ghost" onClick={() => setShowSent(p => ({ ...p, [o._id]: !p[o._id] }))}>
                    {showSent[o._id] ? 'Chhupayein' : `Ready ho chuke KOT (${done.length})`}
                  </button>
                  {showSent[o._id] && [...done].reverse().map(k => (
                    <div key={k.no} className="sess" style={{ marginTop: 9, borderColor: 'var(--line-2)', background: 'var(--surface-2)' }}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <b>KOT #{k.no}</b> <span className="hint">· {tstr(k.at)} · {k.servedAt ? 'served' : 'ready, serve baaki'}</span><br />
                        <span className="hint">{k.items.map(kotLine).join(', ')}</span>
                      </span>
                      <button className="btn sm ghost" onClick={() => printKotSlip(o, k, shopName, true)}>Reprint</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
