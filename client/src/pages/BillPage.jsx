import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import { useConfig } from '../context/ConfigContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { billSubtotal, billDiscount, billTotalWithAuto, kidsOnBill } from '../utils/bill';
import { uid } from '../utils/uid';
import { useAutoDiscount, previewTotal } from '../hooks/useAutoDiscount';
import CustomerBox from '../components/CustomerBox';
import PlayPanel from '../components/PlayPanel';
import FoodPanel from '../components/FoodPanel';
import SocksPanel from '../components/SocksPanel';
import MemberPanel from '../components/MemberPanel';
import BillItemsCard from '../components/BillItemsCard';
import SessionsCard from '../components/SessionsCard';
import PayBar from '../components/PayBar';
import PaymentSheet from '../components/PaymentSheet';
import PreBillSheet, { draftBill } from '../components/PreBillSheet';
import ReceiptSheet from '../components/ReceiptSheet';
import SplitSheet from '../components/SplitSheet';

const CATS = [
  { key: 'play', label: 'Play area' },
  { key: 'food', label: 'Food' },
  { key: 'socks', label: 'Socks' },
  { key: 'member', label: 'Membership' }
];

export default function BillPage({ billIntent, onConsumeIntent }) {
  const { config } = useConfig();
  const { isAdmin, user } = useAuth();
  const toast = useToast();

  const [phone, setPhone] = useState('');
  const [cust, setCust] = useState(null);
  const [isNew, setIsNew] = useState(false);

  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('amt');
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [serviceCharge, setServiceCharge] = useState(0);
  const [serviceChargeType, setServiceChargeType] = useState('pct');
  const resetService = () => {
    setServiceCharge((config && Number(config.serviceChargeDefault)) || 0);
    setServiceChargeType((config && config.serviceChargeType) || 'pct');
  };
  // Pre-fill Setup's default service charge once settings have loaded.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(resetService, [config && config.serviceChargeDefault, config && config.serviceChargeType]);

  const [cat, setCat] = useState('play');
  const [useMember, setUseMember] = useState(false);
  const [playKids, setPlayKids] = useState(1);
  const [playSlab, setPlaySlab] = useState('s2');
  const [playCustom, setPlayCustom] = useState(0);
  const [sockQty, setSockQty] = useState(1);

  const [sheet, setSheet] = useState(null); // 'prebill' | 'pay' | 'receipt' | 'split' | 'splitpay' | null
  const [split, setSplit] = useState(null); // { picked, phone, name, total }
  const [lastBill, setLastBill] = useState(null);
  const [lastCust, setLastCust] = useState(null);

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
    // Skip re-fetching when `cust` already matches this phone (e.g. it was just
    // set directly by a cross-page navigation or the session "End & bill" flow).
    if (phone.length === 10 && !(cust && cust.phone === phone)) findCustomer(phone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  useEffect(() => {
    if (!billIntent) return;
    if (billIntent.cust) {
      setCust(billIntent.cust); setIsNew(false); setPhone(billIntent.cust.phone);
    } else if (billIntent.phone) {
      setPhone(billIntent.phone);
    }
    if (billIntent.cat) setCat(billIntent.cat);
    onConsumeIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billIntent]);

  const walkin = () => { setCust(null); setIsNew(false); setPhone(''); setRedeemPoints(0); };

  useEffect(() => { setRedeemPoints(0); }, [cust && cust.phone]);

  const addItem = (item) => setItems(prev => [...prev, { id: uid(), ...item }]);
  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id));

  const clearBill = () => {
    if (!items.length) return;
    if (!window.confirm('Bill clear kar dein?')) return;
    setItems([]); setDiscount(0);
  };

  const sub = billSubtotal(items);
  const disc = billDiscount(items, discount, discountType);
  const autoDiscount = useAutoDiscount((cust && cust.phone) || phone, items, { discount, discountType, redeemPoints, serviceCharge, serviceChargeType });
  // A split bill keeps a % service charge; a flat ₹ one stays on the main bill.
  const splitService = { serviceCharge: serviceChargeType === 'pct' ? serviceCharge : 0, serviceChargeType };
  const total = billTotalWithAuto(items, discount, discountType, autoDiscount);
  const kids = kidsOnBill(items);

  const resetAfterSave = () => {
    setItems([]); setDiscount(0); setRedeemPoints(0); setUseMember(false); setPlayKids(1); setPlayCustom(0); resetService();
    setCust(null); setIsNew(false); setPhone('');
  };

  const onSaveBill = async (pay) => {
    const { data } = await api.post('/bills', {
      phone: (cust && cust.phone) || '',
      name: (cust && cust.name) || 'Walk-in',
      items: items.map(({ id, ...rest }) => rest),
      kid: (cust && cust.kid) || '', kidDob: (cust && cust.kidDob) || '', anniversary: (cust && cust.anniversary) || '',
      discount, discountType, pay, redeemPoints, serviceCharge, serviceChargeType
    });
    setLastBill(data.bill); setLastCust(data.customer);
    resetAfterSave();
    setSheet('receipt');
  };

  // Separate bill for just the picked lines (play vs food, or one guest's
  // items); whatever wasn't picked stays in the cart for the next bill.
  const startSplitPay = async ({ picked, phone: sPhone, name: sName }) => {
    try {
      const t = await previewTotal(sPhone, picked, splitService);
      setSplit({ picked, phone: sPhone, name: sName, total: t });
      setSheet('splitpay');
    } catch (e) {
      toast('Total nahi nikal paya — dobara try karein');
    }
  };

  const onSaveSplit = async (pay) => {
    const { data } = await api.post('/bills', {
      phone: split.phone, name: split.name || 'Walk-in',
      items: split.picked.map(({ id, ...rest }) => rest),
      discount: 0, discountType: 'amt', pay, redeemPoints: 0, ...splitService
    });
    const left = items.map(i => {
      const p = split.picked.find(x => x.id === i.id);
      if (!p) return i;
      const q = i.qty - p.qty;
      return q > 0 ? { ...i, qty: q, amount: q * i.rate } : null;
    }).filter(Boolean);
    if (left.length) setItems(left); else resetAfterSave();
    setLastBill(data.bill); setLastCust(data.customer);
    setSplit(null);
    setSheet('receipt');
  };

  if (!config) return <p className="hint">Loading…</p>;

  return (
    <>
      <SessionsCard cust={cust} setCust={setCust} setIsNew={setIsNew} setPhone={setPhone} config={config} addItem={addItem} toast={toast} />

      <div className="card">
        <div className="hd"><h2>Customer</h2><div className="spacer"></div><span className="hint">Phone se purana record aa jayega</span></div>
        <div className="bd">
          <CustomerBox phone={phone} setPhone={setPhone} cust={cust} setCust={setCust}
            isNew={isNew} setIsNew={setIsNew} onFind={() => findCustomer(phone)} onWalkin={walkin} />
        </div>
      </div>

      <div className="card">
        <div className="hd"><h2>Add to bill</h2></div>
        <div className="bd">
          <div className="seg" style={{ marginBottom: 14 }}>
            {CATS.map(c => (
              <button key={c.key} aria-pressed={cat === c.key} onClick={() => setCat(c.key)}>{c.label}</button>
            ))}
          </div>
          {cat === 'play' && (
            <PlayPanel config={config} cust={cust}
              useMember={useMember} setUseMember={setUseMember}
              playKids={playKids} setPlayKids={setPlayKids}
              playSlab={playSlab} setPlaySlab={setPlaySlab}
              playCustom={playCustom} setPlayCustom={setPlayCustom}
              onAdd={addItem} toast={toast} />
          )}
          {cat === 'food' && <FoodPanel config={config} items={items} onAdd={addItem} setItems={setItems} />}
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
            points={config.loyalty && config.loyalty.enabled && cust && !isNew ? cust.points || 0 : 0} pointValue={config.loyalty && config.loyalty.pointValue}
            redeemPoints={redeemPoints} setRedeemPoints={setRedeemPoints}
            serviceCharge={serviceCharge} setServiceCharge={setServiceCharge}
            serviceChargeType={serviceChargeType} setServiceChargeType={setServiceChargeType} serviceChargeOn={config.serviceChargeOn} />
        </div>
      </div>

      <PayBar itemsCount={items.length} kids={kids} total={total} onClear={clearBill} onPay={() => setSheet('prebill')} onSplit={() => setSheet('split')} />

      <PreBillSheet open={sheet === 'prebill'} config={config} onEdit={() => setSheet(null)} onPay={() => setSheet('pay')}
        bill={sheet === 'prebill' || sheet === 'pay' ? draftBill({ items, sub, disc, autoDiscount, total, serviceCharge, serviceChargeType,
          name: cust && cust.name, phone: (cust && cust.phone) || phone, staff: user && user.username }) : null} />
      <PaymentSheet open={sheet === 'pay'} total={total} onClose={() => setSheet('prebill')} onSave={onSaveBill} />
      <SplitSheet open={sheet === 'split'} items={items} onClose={() => setSheet(null)} onNext={startSplitPay} />
      <PaymentSheet open={sheet === 'splitpay'} total={split ? split.total : 0} onClose={() => setSheet('split')} onSave={onSaveSplit}
        initialNote={split ? `Alag bill: ${split.picked.map(i => i.name + (i.qty > 1 ? ' ×' + i.qty : '')).join(', ')}` : undefined} />
      <ReceiptSheet open={sheet === 'receipt'} bill={lastBill} customer={lastCust} config={config} onClose={() => setSheet(null)} />
    </>
  );
}
