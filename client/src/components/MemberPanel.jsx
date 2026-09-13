import { useState } from 'react';
import { INR } from '../utils/money';
import { memberActive, memberLabel } from '../utils/member';

export default function MemberPanel({ config, cust, setPhone, items, onAdd, toast }) {
  const [memPhone, setMemPhone] = useState('');

  if (!cust) {
    return (
      <>
        <p className="hint" style={{ margin: '0 0 10px' }}>Membership kisi customer ke naam par banti hai. Number daaliye:</p>
        <div className="row">
          <input type="tel" inputMode="numeric" maxLength={10} placeholder="10 digit number" style={{ flex: '2 1 180px' }}
            value={memPhone} onChange={e => setMemPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} />
          <button className="btn dark" style={{ flex: '0 0 auto' }} onClick={() => {
            if (memPhone.length !== 10) { toast('10 digit number daaliye'); return; }
            setPhone(memPhone);
          }}>Aage badhein</button>
        </div>
      </>
    );
  }

  const cur = cust.membership, active = memberActive(cust);
  const alreadyHasPlan = items.some(i => i.cat === 'member');

  return (
    <>
      {cur && (
        <div className="custfound" style={{ marginBottom: 12, background: active ? 'var(--grape-soft)' : 'var(--berry-soft)', borderColor: active ? 'var(--grape)' : 'var(--berry)' }}>
          <div className="av" style={{ background: active ? 'var(--grape)' : 'var(--berry)' }}>M</div>
          <div><b>{cur.planName}</b><div className="hint">{memberLabel(cust)}</div>
            <div className="hint">{active ? 'Wahi plan dobara lene par hours aur validity jud jayenge.' : 'Expired — naya plan lene par fresh shuru hoga.'}</div>
          </div>
        </div>
      )}
      <div className="menu">
        {config.plans.map(pl => {
          const same = active && cur && cur.planId === pl.id;
          return (
            <button key={pl.id} className="mi" style={{ padding: 14 }} onClick={() => {
              if (alreadyHasPlan) { toast('Ek bill me ek hi plan'); return; }
              onAdd({
                cat: 'member', refId: pl.id, name: 'Membership · ' + pl.name, qty: 1, rate: pl.price, amount: pl.price,
                meta: { hours: pl.hours, days: pl.days, planName: pl.name }
              });
              toast('Plan added');
            }}>
              <strong style={{ fontSize: '14.5px', fontWeight: 700 }}>{pl.name}{same ? ' · renew' : ''}</strong>
              <em>{INR(pl.price)} · {pl.hours > 0 ? pl.hours + ' hrs' : 'Unlimited'} · {pl.days} days</em>
            </button>
          );
        })}
      </div>
      <p className="hint" style={{ margin: '11px 0 0' }}>Plan bechne par paise aaj ki sale me "Membership" me jayenge; baad me play free/deduct hoga.</p>
    </>
  );
}
