import { useEffect, useState } from 'react';
import api from '../api/client';
import { useConfig } from '../context/ConfigContext';
import { useToast } from '../context/ToastContext';
import { INR } from '../utils/money';
import { memberActive, memberLabel, planSummary } from '../utils/member';
import PaymentSheet from './PaymentSheet';
import ReceiptSheet from './ReceiptSheet';

// Sell a membership straight from the Members tab: number → name / child →
// plan → payment. It's saved as a normal bill (so the money shows in the day's
// sale under Membership, with its payment mode) and the receipt prints.
export default function NewMembershipCard({ onDone, prefill }) {
  const { config } = useConfig();
  const toast = useToast();
  const [phone, setPhone] = useState('');
  const [cust, setCust] = useState(null);
  const [name, setName] = useState('');
  const [kid, setKid] = useState('');
  const [planId, setPlanId] = useState('');
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState(null);

  // Renew from the list below: fill that member's number (and their plan).
  useEffect(() => {
    if (!prefill) return;
    setName(''); setKid(''); setPlanId('');
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
        const m = data.customer.membership;
        if (m && (config && config.plans || []).some(p => p.id === m.planId)) setPlanId(id => id || m.planId);
      }
    }).catch(() => { if (!cancelled) setCust(null); });
    return () => { cancelled = true; };
  }, [phone]);

  if (!config) return null;
  const plans = config.plans || [];
  const plan = plans.find(p => p.id === planId);
  const cur = cust && cust.membership;
  const active = memberActive(cust);

  const reset = () => { setPhone(''); setCust(null); setName(''); setKid(''); setPlanId(''); };

  const takePayment = () => {
    if (phone.length !== 10) { toast('10 digit mobile number daaliye'); return; }
    if (!name.trim()) { toast('Member ka naam daaliye'); return; }
    if (!plan) { toast('Plan chunein'); return; }
    setPaying(true);
  };

  const save = async (pay) => {
    const { data } = await api.post('/bills', {
      phone, name: name.trim(), kid: kid.trim(),
      items: [{
        cat: 'member', refId: plan.id, name: 'Membership · ' + plan.name, qty: 1, rate: plan.price, amount: plan.price,
        meta: { kind: plan.kind || 'hours', hours: plan.hours, visits: plan.visits || 0, days: plan.days, planName: plan.name }
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
        <label className="f" style={{ flex: '1 1 160px' }}><span>Parent / member ka naam</span>
          <input type="text" value={name} onChange={e => setName(e.target.value)} /></label>
        <label className="f" style={{ flex: '1 1 160px' }}><span>Bachche ka naam</span>
          <input type="text" value={kid} onChange={e => setKid(e.target.value)} /></label>
      </div>

      {cur && (
        <p className="hint" style={{ margin: '-4px 0 10px', color: active ? 'var(--grape)' : undefined }}>
          Abhi: {memberLabel(cust)}{active ? ' — wahi plan dobara lene par visits / hours jud jayenge; alag plan lene par naya shuru hoga.' : ''}
        </p>
      )}

      <span className="hint" style={{ display: 'block', marginBottom: 6 }}>Plan</span>
      {!plans.length ? (
        <p className="hint">Koi plan nahi hai — Setup → Membership plans me add karein.</p>
      ) : (
        <div className="menu" style={{ marginBottom: 12 }}>
          {plans.map(p => (
            <button key={p.id} className={'mi' + (planId === p.id ? ' on' : '')} style={{ padding: 14 }} onClick={() => setPlanId(p.id)}>
              <strong style={{ fontSize: '14.5px', fontWeight: 700 }}>{p.name}</strong>
              <em>{INR(p.price)} · {planSummary(p)}</em>
            </button>
          ))}
        </div>
      )}

      <button className="btn primary" style={{ width: '100%', padding: 14 }} disabled={!plan} onClick={takePayment}>
        {plan ? `Payment lein — ${INR(plan.price)}` : 'Plan chunein'}
      </button>

      <PaymentSheet open={paying} total={plan ? plan.price : 0} onClose={() => setPaying(false)} onSave={save}
        initialNote={plan ? `${name || phone} · ${plan.name} (${planSummary(plan)})` : undefined} />
      <ReceiptSheet open={!!receipt} bill={receipt && receipt.bill} customer={receipt && receipt.customer} config={config}
        onClose={() => setReceipt(null)} doneLabel="Done" />
    </div></div>
  );
}
