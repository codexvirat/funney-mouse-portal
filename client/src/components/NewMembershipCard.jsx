import { useEffect, useState } from 'react';
import api from '../api/client';
import { useConfig } from '../context/ConfigContext';
import { useToast } from '../context/ToastContext';
import { INR } from '../utils/money';
import { memberActive, memberLabel, planSummary } from '../utils/member';
import PaymentSheet from './PaymentSheet';
import ReceiptSheet from './ReceiptSheet';

// Sell a membership straight from the Members tab, with the same details as
// the shop's membership register: number → parent / child / card holder →
// plan → amount → payment. It's saved as a normal bill (so the money shows in the day's
// sale under Membership, with its payment mode) and the receipt prints.
export default function NewMembershipCard({ onDone, prefill }) {
  const { config } = useConfig();
  const toast = useToast();
  const [phone, setPhone] = useState('');
  const [cust, setCust] = useState(null);
  const [name, setName] = useState('');
  const [kid, setKid] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [planId, setPlanId] = useState('');
  const [count, setCount] = useState(1);
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState(null);

  // Renew from the list below: fill that member's number (and their plan).
  useEffect(() => {
    if (!prefill) return;
    setName(''); setKid(''); setAltPhone(''); setCardHolder(''); setPlanId(''); setCount(1); setAmount(''); setRemark('');
    setPhone(prefill.phone);
  }, [prefill]);

  useEffect(() => {
    if (phone.length !== 10) { setCust(null); return undefined; }
    let cancelled = false;
    api.get('/customers/' + phone).then(({ data }) => {
      if (cancelled) return;
      setCust(data.customer);
      if (data.customer) {
        setName(n => n || data.customer.name || ''); setKid(k => k || data.customer.kid || '');
        setAltPhone(a => a || data.customer.altPhone || '');
        const m = data.customer.membership;
        if (m && m.cardHolder) setCardHolder(c => c || m.cardHolder);
        const old = m && (config && config.plans || []).find(p => p.id === m.planId);
        if (old) { setPlanId(id => id || old.id); setAmount(a => a === '' ? String(old.price) : a); }
      }
    }).catch(() => { if (!cancelled) setCust(null); });
    return () => { cancelled = true; };
  }, [phone]);

  if (!config) return null;
  const plans = config.plans || [];
  const plan = plans.find(p => p.id === planId);
  const cur = cust && cust.membership;
  const active = memberActive(cust);

  const price = Math.max(0, Math.round(Number(amount) || 0));
  const pickPlan = (p) => { setPlanId(p.id); setAmount(String(p.price * count)); };
  // Several passes at once, e.g. 2 × 10 visits for two children.
  const setPasses = (n) => { setCount(n); if (plan) setAmount(String(plan.price * n)); };
  const isPass = !!(plan && plan.kind === 'visits');
  const passes = isPass ? count : 1;
  const passName = plan ? plan.name + (passes > 1 ? ' ×' + passes : '') : '';

  const reset = () => {
    setPhone(''); setCust(null); setName(''); setKid(''); setAltPhone(''); setCardHolder('');
    setPlanId(''); setCount(1); setAmount(''); setRemark('');
  };

  const takePayment = () => {
    if (phone.length !== 10) { toast('10 digit mobile number daaliye'); return; }
    if (!name.trim()) { toast('Member ka naam daaliye'); return; }
    if (!kid.trim()) { toast('Bachche ka naam daaliye'); return; }
    if (altPhone && altPhone.length !== 10) { toast('Doosra number 10 digit ka hona chahiye'); return; }
    if (!plan) { toast('Plan chunein'); return; }
    if (!price) { toast('Amount daaliye'); return; }
    setPaying(true);
  };

  const save = async (pay) => {
    const { data } = await api.post('/bills', {
      phone, altPhone, name: name.trim(), kid: kid.trim(),
      items: [{
        cat: 'member', refId: plan.id, name: 'Membership · ' + passName, qty: 1, rate: price, amount: price,
        meta: {
          kind: plan.kind || 'hours', hours: plan.hours, visits: plan.visits || 0, days: plan.days, planName: plan.name, count: passes,
          cardHolder: cardHolder.trim() || name.trim(), remark: remark.trim()
        }
      }],
      discount: 0, discountType: 'amt', pay
    });
    setPaying(false);
    toast(name.trim() + ' ki membership ban gayi');
    setReceipt({ bill: data.bill, customer: data.customer });
    reset();
    if (onDone) onDone();
  };

  return (
    <div className="card"><div className="hd"><h2>Nayi membership</h2></div><div className="bd">
      <div className="row">
        <label className="f" style={{ flex: '1 1 160px' }}><span>Mobile number</span>
          <input type="tel" inputMode="numeric" maxLength={10} placeholder="10 digit number"
            value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} /></label>
        <label className="f" style={{ flex: '1 1 160px' }}><span>Doosra number (optional)</span>
          <input type="tel" inputMode="numeric" maxLength={10} placeholder="10 digit number"
            value={altPhone} onChange={e => setAltPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} /></label>
      </div>
      <div className="row">
        <label className="f" style={{ flex: '1 1 160px' }}><span>Parent ka naam</span>
          <input type="text" value={name} onChange={e => setName(e.target.value)} /></label>
        <label className="f" style={{ flex: '1 1 160px' }}><span>Bachche ka naam</span>
          <input type="text" value={kid} placeholder="Do bachche: Shaurya, Suveera" onChange={e => setKid(e.target.value)} /></label>
        <label className="f" style={{ flex: '1 1 160px' }}><span>Card holder</span>
          <input type="text" value={cardHolder} placeholder={name || 'Parent ka naam'} onChange={e => setCardHolder(e.target.value)} /></label>
      </div>

      {cur && (
        <p className="hint" style={{ margin: '-4px 0 10px', color: active ? 'var(--grape)' : undefined }}>
          Abhi: {memberLabel(cust)}{active ? (cur.kind === 'visits'
            ? ' — naya pass isi me jud jayega (visits add honge). Naye bachche ka naam upar jod dein.'
            : ' — wahi plan dobara lene par hours jud jayenge; alag plan lene par naya shuru hoga.') : ''}
        </p>
      )}

      <span className="hint" style={{ display: 'block', marginBottom: 6 }}>Plan</span>
      {!plans.length ? (
        <p className="hint">Koi plan nahi hai — Setup → Membership plans me add karein.</p>
      ) : (
        <div className="menu" style={{ marginBottom: 12 }}>
          {plans.map(p => (
            <button key={p.id} className={'mi' + (planId === p.id ? ' on' : '')} style={{ padding: 14 }} onClick={() => pickPlan(p)}>
              <strong style={{ fontSize: '14.5px', fontWeight: 700 }}>{p.name}</strong>
              <em>{INR(p.price)} · {planSummary(p)}</em>
            </button>
          ))}
        </div>
      )}

      {plan && (
        <div className="row" style={{ alignItems: 'flex-end' }}>
          {isPass && (
            <div style={{ flex: '0 0 auto', marginBottom: 11 }}>
              <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginBottom: 5 }}>Kitne pass</span>
              <div className="stepper"><button onClick={() => setPasses(Math.max(1, count - 1))}>−</button><b>{count}</b><button onClick={() => setPasses(Math.min(10, count + 1))}>+</button></div>
            </div>
          )}
          <label className="f" style={{ flex: '1 1 120px' }}><span>Amount (₹)</span>
            <input type="number" inputMode="numeric" min="0" value={amount} onChange={e => setAmount(e.target.value)} /></label>
          <label className="f" style={{ flex: '3 1 220px' }}><span>Remark (optional)</span>
            <input type="text" value={remark} maxLength={200} placeholder="Jaise: 2 visit free diye, discount kyun diya" onChange={e => setRemark(e.target.value)} /></label>
        </div>
      )}

      {isPass && passes > 1 && (
        <p className="hint" style={{ margin: '-4px 0 10px' }}>
          {passes} × {plan.name} = {plan.visits > 0 ? plan.visits * passes + ' visits' : 'unlimited visits'} ek hi number par — har bachche ki har visit isme se katti hai.
        </p>
      )}
      <button className="btn primary" style={{ width: '100%', padding: 14 }} disabled={!plan} onClick={takePayment}>
        {plan ? `Payment lein — ${INR(price)}` : 'Plan chunein'}
      </button>

      <PaymentSheet open={paying} total={plan ? price : 0} onClose={() => setPaying(false)} onSave={save}
        initialNote={plan ? `${name || phone} · ${passName} (${planSummary(plan)})` : undefined} />
      <ReceiptSheet open={!!receipt} bill={receipt && receipt.bill} customer={receipt && receipt.customer} config={config}
        onClose={() => setReceipt(null)} doneLabel="Done" />
    </div></div>
  );
}
