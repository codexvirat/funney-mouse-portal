import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { billSubtotal, billDiscount, billTotalWithAuto, kidsOnBill } from '../utils/bill';
import { uid } from '../utils/uid';
import { memberActive } from '../utils/member';
import { useAutoDiscount } from '../hooks/useAutoDiscount';
import { INR } from '../utils/money';
import { pendingKot, printKotSlip } from '../utils/kot';
import { playAlert } from '../utils/notify';
import { tstr } from '../utils/date';
import { slabSorted } from '../utils/bill';
import CustomerBox from '../components/CustomerBox';
import PlayPanel from '../components/PlayPanel';
import FoodPanel from '../components/FoodPanel';
import SocksPanel from '../components/SocksPanel';
import MemberPanel from '../components/MemberPanel';
import BillItemsCard from '../components/BillItemsCard';
import PayBar from '../components/PayBar';
import PaymentSheet from '../components/PaymentSheet';
import ReceiptSheet from '../components/ReceiptSheet';
import Sheet from '../components/Sheet';
import WaiterInput, { useCaptains, captainFor } from '../components/WaiterInput';

const CATS = [
  { key: 'play', label: 'Play area' },
  { key: 'food', label: 'Food' },
  { key: 'socks', label: 'Socks' },
  { key: 'member', label: 'Membership' }
];

// A table's whole open visit (food + play together), server-persisted via
// TableOrder so it survives refresh/another device — unlike BillPage's
// quick-bill flow, which only ever keeps one draft in local React state.
export default function TableDetailPage({ order, config, freeTables, otherOrders, onSyncOrder, onBack, onClosed, onTransferred, onMerged }) {
  const { isAdmin, user } = useAuth();
  // Captains run the table but billing/cancel/merge stay with the counter.
  const canBill = user.role !== 'captain';
  const captains = useCaptains();
  const toast = useToast();

  const [phone, setPhone] = useState(order.phone || '');
  const [cust, setCust] = useState(null);
  const [isNew, setIsNew] = useState(false);

  const [items, setItems] = useState(() => order.items.map(i => ({ id: uid(), ...i })));
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('amt');
  const [redeemPoints, setRedeemPoints] = useState(0);

  const [cat, setCat] = useState('play');
  const [useMember, setUseMember] = useState(false);
  const [playKids, setPlayKids] = useState(Math.max(1, order.kids || 1));
  const [playSlab, setPlaySlab] = useState('s2');
  const [playCustom, setPlayCustom] = useState(0);
  const [sockQty, setSockQty] = useState(1);

  const [adults, setAdults] = useState(order.adults || 0);
  const [kidCount, setKidCount] = useState(order.kids || 0);
  const [waiterName, setWaiterName] = useState(order.waiterName || '');

  const [sheet, setSheet] = useState(null); // 'pay' | 'receipt' | 'transfer' | 'merge' | null
  const [lastBill, setLastBill] = useState(null);
  const [lastCust, setLastCust] = useState(null);
  const [, setTick] = useState(0);

  const table = (config.tables || []).find(t => t.id === order.tableId);
  const capacity = table && table.capacity;

  useEffect(() => {
    if (!order.phone) return;
    let cancelled = false;
    api.get('/customers/' + order.phone).then(({ data }) => {
      if (!cancelled && data.customer) { setCust(data.customer); setIsNew(false); }
    }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const clock = setInterval(() => setTick(t => t + 1), 20000);
    return () => clearInterval(clock);
  }, []);

  const findCustomer = useCallback(async (p) => {
    if (p.length !== 10) { toast('10 digit number daaliye'); return; }
    try {
      const { data } = await api.get('/customers/' + p);
      if (data.customer) {
        setCust(data.customer); setIsNew(false);
        toast('Repeat customer: ' + (data.customer.name || p));
      } else {
        setCust({ phone: p, name: '', kid: '', visits: 0, totalSpend: 0, recent: [], membership: null });
        setIsNew(true);
      }
      setUseMember(false);
    } catch (e) {
      toast('Customer fetch fail ho gaya');
    }
  }, [toast]);

  useEffect(() => {
    if (phone.length === 10 && !(cust && cust.phone === phone)) findCustomer(phone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  // Table edits (add/remove item, bump adults/kids, attach customer) each
  // fire their own PATCH. Mongoose version-guards array saves, so two
  // overlapping PATCHes on the same order (e.g. tapping two menu items in
  // quick succession) would race and one would fail with a VersionError.
  // Chaining them onto one promise keeps saves sequential per table.
  const saveChain = useRef(Promise.resolve());
  const persist = useCallback((patch) => {
    saveChain.current = saveChain.current
      .catch(() => {})
      .then(() => api.patch('/table-orders/' + order._id, patch))
      .then(({ data }) => onSyncOrder(data.order))
      .catch(() => toast('Save fail ho gaya'));
  }, [order._id, onSyncOrder, toast]);

  const mutateItems = useCallback((updater) => {
    setItems(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      persist({ items: next.map(({ id, ...rest }) => rest) });
      return next;
    });
  }, [persist]);

  const addItem = (item) => mutateItems(prev => [...prev, { id: uid(), ...item }]);
  const removeItem = (id) => mutateItems(prev => prev.filter(i => i.id !== id));

  const clearBill = () => {
    if (!items.length) return;
    if (!window.confirm('Bill clear kar dein?')) return;
    mutateItems(() => []);
    setDiscount(0);
  };

  const walkin = () => {
    setCust(null); setIsNew(false); setPhone('');
    persist({ phone: '', name: 'Walk-in' });
  };

  useEffect(() => {
    if (cust && cust.phone) persist({ phone: cust.phone, name: cust.name || 'Walk-in' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cust]);

  const bumpAdults = (d) => { const v = Math.max(0, adults + d); setAdults(v); persist({ adults: v }); };
  const bumpKids = (d) => { const v = Math.max(0, kidCount + d); setKidCount(v); persist({ kids: v }); };
  const saveWaiter = () => persist({ waiterName, waiterUser: captainFor(waiterName, captains) });

  const sub = billSubtotal(items);
  const disc = billDiscount(items, discount, discountType);
  const autoDiscount = useAutoDiscount((cust && cust.phone) || phone, items, { discount, discountType, redeemPoints });
  const loyaltyOn = !!(config.loyalty && config.loyalty.enabled);
  useEffect(() => { setRedeemPoints(0); }, [cust && cust.phone]);
  const total = billTotalWithAuto(items, discount, discountType, autoDiscount);
  const overCapacity = capacity && (adults + kidCount) > capacity;

  const kotPending = pendingKot({ ...order, items }).reduce((a, i) => a + i.qty, 0);

  const playRunning = !!order.playStart;
  const playMins = playRunning ? Math.max(0, Math.round((Date.now() - new Date(order.playStart).getTime()) / 60000)) : 0;

  const startTimer = async () => {
    try {
      const slab = slabSorted(config).find(s => s.id === playSlab) || slabSorted(config)[0];
      const { data } = await api.post(`/table-orders/${order._id}/play/start`, {
        kids: playKids, member: !!(useMember && memberActive(cust)),
        plannedMins: playCustom || (slab && slab.minutes) || 0
      });
      onSyncOrder(data.order);
      toast('Timer started');
    } catch (e) {
      toast('Timer start fail ho gaya');
    }
  };

  const endTimer = async () => {
    try {
      const { data } = await api.post(`/table-orders/${order._id}/play/end`);
      onSyncOrder(data.order);
      setItems(data.order.items.map(i => ({ id: uid(), ...i })));
      toast('Play time bill me add ho gaya');
    } catch (e) {
      toast('Kuch gadbad ho gayi');
    }
  };

  // Items are PATCHed through saveChain, so wait for it before asking the
  // server what's pending — otherwise a just-tapped item could miss the KOT.
  const printKOT = async () => {
    await saveChain.current.catch(() => {});
    if (!pendingKot({ ...order, items }).length) { toast('Kitchen ko bhejne ke liye naya food item nahi hai'); return; }
    try {
      const { data } = await api.post(`/table-orders/${order._id}/kot`);
      onSyncOrder(data.order);
      printKotSlip(data.order, data.kot, (config && config.shopName) || 'Funny Mouse');
      toast('KOT #' + data.kot.no + ' print ho gaya');
    } catch (e) {
      toast((e.response && e.response.data && e.response.data.message) || 'KOT print nahi hua');
    }
  };

  const addNote = (item) => {
    const note = window.prompt('Kitchen ke liye note (e.g. less spicy, no onion):', (item.meta && item.meta.note) || '');
    if (note === null) return;
    const clean = note.trim().slice(0, 80);
    mutateItems(prev => prev.map(i => i.id === item.id ? { ...i, meta: { ...(i.meta || {}), note: clean } } : i));
  };

  const markServed = async (kot) => {
    try {
      const { data } = await api.post(`/table-orders/${order._id}/kot/${kot.no}/served`);
      onSyncOrder(data.order);
    } catch (e) {
      toast('Update nahi hua');
    }
  };

  // Accepting a QR order adds its items on the server, so wait for pending
  // saves first and then take the server's item list as the new truth.
  const handleRequest = async (r, action) => {
    await saveChain.current.catch(() => {});
    try {
      const { data } = await api.post(`/table-orders/${order._id}/requests/${r.id}`, { action });
      onSyncOrder(data.order);
      if (action === 'accept') {
        setItems(data.order.items.map(i => ({ id: uid(), ...i })));
        toast('Order bill me add ho gaya — ab KOT print karein');
      } else {
        toast('Order reject kar diya');
      }
    } catch (e) {
      toast((e.response && e.response.data && e.response.data.message) || 'Update nahi hua');
    }
  };

  const readyKots = (order.kots || []).filter(k => k.readyAt && !k.servedAt);
  const newRequests = (order.requests || []).filter(r => r.status === 'new');
  const playWarn = playRunning ? playAlert(order.playStart, order.playPlannedMins) : null;

  const startService = () => persist({ reserved: false });

  const doTransfer = async (toTable) => {
    try {
      const { data } = await api.post(`/table-orders/${order._id}/transfer`, { toTableId: toTable.id, toTableName: toTable.name });
      setSheet(null);
      onTransferred(data.order);
      toast('Table transfer ho gaya');
    } catch (e) {
      toast((e.response && e.response.data && e.response.data.message) || 'Transfer nahi hua');
    }
  };

  const doMerge = async (target) => {
    if (!window.confirm(`${order.tableName} ko ${target.tableName} me merge kar dein?`)) return;
    try {
      await api.post(`/table-orders/${order._id}/merge`, { targetId: target._id });
      setSheet(null);
      onMerged();
      toast('Tables merge ho gaye');
    } catch (e) {
      toast((e.response && e.response.data && e.response.data.message) || 'Merge nahi hua');
    }
  };

  // Clamp to `total` so an advance bigger than the final bill (e.g. a small
  // top-up order against a large event token) can never leave the payment
  // sheet stuck in "overpaid" with no way to reach a valid split.
  const initialPay = order.advance > 0 ? { [order.advanceMode || 'CASH']: Math.min(order.advance, total) } : undefined;
  const initialNote = order.advance > 0 ? `Advance ${INR(order.advance)} (${order.advanceMode}) pehle hi collect ho chuka hai.` : undefined;

  const onSaveBill = async (pay) => {
    const { data } = await api.post(`/table-orders/${order._id}/checkout`, {
      discount, discountType, pay, redeemPoints,
      kid: (cust && cust.kid) || '', kidDob: (cust && cust.kidDob) || '', anniversary: (cust && cust.anniversary) || ''
    });
    setLastBill(data.bill); setLastCust(data.customer);
    setSheet('receipt');
  };

  const cancelTable = async () => {
    if (!window.confirm(order.tableName + ' cancel kar dein? Koi bill nahi banega.')) return;
    try {
      await api.delete('/table-orders/' + order._id);
      onClosed();
    } catch (e) {
      toast('Cancel nahi hua');
    }
  };

  const closeReceipt = () => { setSheet(null); onClosed(); };

  if (order.reserved) {
    return (
      <>
        <div className="row" style={{ alignItems: 'center', marginBottom: 4, flexWrap: 'nowrap' }}>
          <button className="btn ghost sm" style={{ flex: '0 0 auto' }} onClick={onBack}>← Tables</button>
          <h2 style={{ margin: '0 0 0 4px', fontSize: 17, flex: 1, minWidth: 0 }}>{order.tableName} · Reserved</h2>
        </div>
        <div className="card"><div className="bd">
          <p><b>{order.name || 'Walk-in'}</b>{order.phone ? ' · ' + order.phone : ''}</p>
          {order.reservedNote && <p className="hint">{order.reservedNote}</p>}
          <p className="hint">{order.adults} adults · {order.kids} kids{order.waiterName ? ' · Waiter: ' + order.waiterName : ''}</p>
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn primary" style={{ flex: '2 1 160px' }} onClick={startService}>Guest aa gaye — start service</button>
            {canBill && <button className="btn danger" style={{ flex: '1 1 120px' }} onClick={cancelTable}>Cancel reservation</button>}
          </div>
        </div></div>
      </>
    );
  }

  return (
    <>
      <div className="row" style={{ alignItems: 'center', marginBottom: 4, flexWrap: 'nowrap' }}>
        <button className="btn ghost sm" style={{ flex: '0 0 auto' }} onClick={onBack}>← Tables</button>
        <h2 style={{ margin: '0 0 0 4px', fontSize: 17, flex: 1, minWidth: 0 }}>{order.tableName}</h2>
        {canBill && <button className="btn sm danger" style={{ flex: '0 0 auto' }} onClick={cancelTable}>Cancel table</button>}
      </div>

      <div className="card">
        <div className="hd"><h2>Guests</h2><div className="spacer"></div>
          <button className="btn sm ghost" onClick={() => setSheet('transfer')}>Transfer</button>{' '}
          {canBill && <button className="btn sm ghost" onClick={() => setSheet('merge')}>Merge</button>}
        </div>
        <div className="bd">
          <div className="row">
            <div style={{ flex: '0 0 auto' }}>
              <span className="hint" style={{ display: 'block', marginBottom: 5 }}>Adults</span>
              <div className="stepper"><button onClick={() => bumpAdults(-1)}>−</button><b>{adults}</b><button onClick={() => bumpAdults(1)}>+</button></div>
            </div>
            <div style={{ flex: '0 0 auto' }}>
              <span className="hint" style={{ display: 'block', marginBottom: 5 }}>Kids</span>
              <div className="stepper"><button onClick={() => bumpKids(-1)}>−</button><b>{kidCount}</b><button onClick={() => bumpKids(1)}>+</button></div>
            </div>
            <label className="f" style={{ margin: 0, flex: '1 1 140px' }}><span>Waiter / captain</span>
              <WaiterInput value={waiterName} onChange={setWaiterName} onBlur={saveWaiter} captains={captains} />
            </label>
          </div>
          {overCapacity && <p className="hint" style={{ color: 'var(--berry)', marginTop: 10 }}>Table ki seating {capacity} hai — guests zyada hain.</p>}
          {order.advance > 0 && <p className="hint" style={{ marginTop: 10 }}>Advance liya hua: {INR(order.advance)} ({order.advanceMode})</p>}
        </div>
      </div>

      <div className="card">
        <div className="hd"><h2>Customer</h2><div className="spacer"></div><span className="hint">Phone se purana record aa jayega</span></div>
        <div className="bd">
          <CustomerBox phone={phone} setPhone={setPhone} cust={cust} setCust={setCust}
            isNew={isNew} setIsNew={setIsNew} onFind={() => findCustomer(phone)} onWalkin={walkin} />
        </div>
      </div>

      {newRequests.map(r => (
        <div className="card" key={r.id} style={{ borderColor: 'var(--grape)' }}>
          <div className="hd"><h2>📱 QR order{r.name ? ' — ' + r.name : ''}</h2><div className="spacer"></div><span className="hint">{tstr(r.at)}</span></div>
          <div className="bd">
            {r.items.map((i, ix) => (
              <div key={ix} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <span>{i.name} × {i.qty}{i.meta && i.meta.note ? <span className="hint"> · {i.meta.note}</span> : null}</span>
                <b className="num">{INR(i.amount)}</b>
              </div>
            ))}
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn primary" onClick={() => handleRequest(r, 'accept')}>Accept — bill me daalo</button>
              <button className="btn danger" onClick={() => handleRequest(r, 'reject')}>Reject</button>
            </div>
          </div>
        </div>
      ))}

      {readyKots.map(k => (
        <div className="sess" key={k.no} style={{ borderColor: 'var(--mint)', background: 'var(--mint-soft)' }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <b>🍽 Kitchen: KOT #{k.no} ready hai</b><br />
            <span className="hint">{k.items.map(i => i.name + ' ×' + i.qty).join(', ')}</span>
          </span>
          <button className="btn sm dark" onClick={() => markServed(k)}>Serve ho gaya</button>
        </div>
      ))}

      {playRunning && (
        <div className="sess" style={playWarn && playWarn.state !== 'ok' ? { borderColor: 'var(--berry)', background: 'var(--berry-soft)' } : undefined}>
          <span className="tm">{Math.floor(playMins / 60)}h {String(playMins % 60).padStart(2, '0')}m</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <b>Play chal raha hai</b><br />
            <span className="hint">{order.playKids} kid{order.playKids > 1 ? 's' : ''}{order.playMember ? ' · membership' : ''}{order.playPlannedMins ? ' · ' + order.playPlannedMins + ' min liya' : ''}</span>
            {playWarn && <><br /><b style={{ color: playWarn.state === 'ok' ? 'var(--muted)' : 'var(--berry)', fontSize: 13 }}>{playWarn.text}</b></>}
          </span>
          <button className="btn sm dark" onClick={endTimer}>End & bill</button>
        </div>
      )}

      <div className="card">
        <div className="hd"><h2>Add to bill</h2>{cat === 'food' && <><div className="spacer"></div><button className="btn sm" onClick={printKOT}>Print KOT{kotPending ? ` (${kotPending})` : ''}</button></>}</div>
        <div className="bd">
          <div className="seg" style={{ marginBottom: 14 }}>
            {CATS.map(c => (
              <button key={c.key} aria-pressed={cat === c.key} onClick={() => setCat(c.key)}>{c.label}</button>
            ))}
          </div>
          {cat === 'play' && !playRunning && (
            <PlayPanel config={config} cust={cust}
              useMember={useMember} setUseMember={setUseMember}
              playKids={playKids} setPlayKids={setPlayKids}
              playSlab={playSlab} setPlaySlab={setPlaySlab}
              playCustom={playCustom} setPlayCustom={setPlayCustom}
              onAdd={addItem} toast={toast} onStartTimer={startTimer} />
          )}
          {cat === 'play' && playRunning && <p className="hint">Timer chal raha hai — pehle "End & bill" karein, phir naya add kar sakte hain.</p>}
          {cat === 'food' && <FoodPanel config={config} items={items} onAdd={addItem} setItems={mutateItems} />}
          {cat === 'socks' && <SocksPanel config={config} sockQty={sockQty} setSockQty={setSockQty} onAdd={addItem} toast={toast} />}
          {cat === 'member' && (
            <MemberPanel config={config} cust={cust} setPhone={setPhone} items={items} onAdd={addItem} toast={toast} />
          )}
        </div>
      </div>

      <div className="card">
        <div className="hd"><h2>Bill</h2></div>
        <div className="bd">
          <BillItemsCard items={items} removeItem={removeItem}
            discount={discount} setDiscount={setDiscount}
            discountType={discountType} setDiscountType={setDiscountType}
            canDiscount={isAdmin || config.staffDiscount !== false}
            sub={sub} disc={disc} total={total} autoDiscount={autoDiscount}
            onNote={addNote}
            points={loyaltyOn && cust && !isNew ? cust.points || 0 : 0} pointValue={config.loyalty && config.loyalty.pointValue}
            redeemPoints={redeemPoints} setRedeemPoints={setRedeemPoints} />
        </div>
      </div>

      {canBill
        ? <PayBar itemsCount={items.length} kids={kidsOnBill(items)} total={total} onClear={clearBill} onPay={() => setSheet('pay')} />
        : <p className="hint" style={{ textAlign: 'center' }}>Bill counter (staff) banayega — total abhi {INR(total)}.</p>}

      <PaymentSheet open={sheet === 'pay'} total={total} onClose={() => setSheet(null)} onSave={onSaveBill} initialPay={initialPay} initialNote={initialNote} />
      <ReceiptSheet open={sheet === 'receipt'} bill={lastBill} customer={lastCust} config={config} onClose={closeReceipt} doneLabel="Back to tables" />

      <Sheet open={sheet === 'transfer'} onClose={() => setSheet(null)}>
        <h2 style={{ margin: '0 0 12px', fontSize: 17 }}>Kis table pe transfer karein?</h2>
        {!freeTables.length && <p className="hint">Koi free table nahi hai.</p>}
        <div className="menu">
          {freeTables.map(t => (
            <button key={t.id} className="mi" onClick={() => doTransfer(t)}><strong>{t.name}</strong><em>seats {t.capacity}</em></button>
          ))}
        </div>
      </Sheet>

      <Sheet open={sheet === 'merge'} onClose={() => setSheet(null)}>
        <h2 style={{ margin: '0 0 12px', fontSize: 17 }}>Kis table me merge karein?</h2>
        {!otherOrders.filter(o => !o.reserved).length && <p className="hint">Koi doosri occupied table nahi hai.</p>}
        <div className="menu">
          {otherOrders.filter(o => !o.reserved).map(o => (
            <button key={o._id} className="mi" onClick={() => doMerge(o)}><strong>{o.tableName}</strong><em>{o.adults + o.kids} guests</em></button>
          ))}
        </div>
      </Sheet>
    </>
  );
}
