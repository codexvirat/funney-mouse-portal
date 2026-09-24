import { useState } from 'react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { INR } from '../utils/money';
import { prettyDate, dayMonth, dstr } from '../utils/date';
import { memberActive, memberLabel } from '../utils/member';

export default function CustomerBox({ phone, setPhone, cust, setCust, isNew, setIsNew, onFind, onWalkin }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [quickDob, setQuickDob] = useState('');
  const [quickKid, setQuickKid] = useState('');
  const [quickAnn, setQuickAnn] = useState('');

  // Saved straight away (it's also sent again with the bill) so the child's
  // birthday is on record for the birthday list even if this visit is
  // never billed.
  const saveDetails = async (patch) => {
    setSaving(true);
    try {
      const body = patch || { name: cust.name, kid: cust.kid, kidDob: cust.kidDob || '', anniversary: cust.anniversary || '' };
      const { data } = await api.patch('/customers/' + cust.phone, body);
      setQuickDob(''); setQuickKid(''); setQuickAnn('');
      setCust({ ...cust, ...data.customer });
      setIsNew(false);
      toast('Customer details save ho gaye');
    } catch (e) {
      toast((e.response && e.response.data && e.response.data.message) || 'Save nahi hua');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="row">
        <label className="f" style={{ flex: '2 1 200px' }}><span>Mobile number</span>
          <input type="tel" inputMode="numeric" maxLength={10} placeholder="10 digit number"
            value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} />
        </label>
        <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'flex-end', gap: 8, paddingBottom: 11 }}>
          <button className="btn" onClick={onFind}>Find</button>
          <button className="btn ghost" onClick={onWalkin}>Walk-in</button>
        </div>
      </div>

      {!cust && <p className="hint" style={{ margin: '6px 0 0' }}>Walk-in bill — customer record ke bina bhi bill ban jayega.</p>}

      {cust && isNew && (
        <>
          <div className="custfound newc" style={{ marginBottom: 12 }}>
            <div className="av">{cust.visits ? '✎' : '+'}</div>
            {cust.visits
              ? <div><b>Details edit karein</b><br /><span className="hint">Naam, bachche ka naam ya birthday badliye</span></div>
              : <div><b>New customer</b><br /><span className="hint">Naam aur bachche ka birthday bhar dijiye — birthday offer bhejne me kaam aayega</span></div>}
          </div>
          <div className="grid2">
            <label className="f"><span>Parent / customer name</span>
              <input type="text" value={cust.name} placeholder="Name" onChange={e => setCust({ ...cust, name: e.target.value })} />
            </label>
            <label className="f"><span>Child name (optional)</span>
              <input type="text" value={cust.kid} placeholder="Bachche ka naam" onChange={e => setCust({ ...cust, kid: e.target.value })} />
            </label>
            <label className="f"><span>Child ka birthday (date of birth)</span>
              <input type="date" max={dstr()} value={cust.kidDob || ''} onChange={e => setCust({ ...cust, kidDob: e.target.value })} />
            </label>
            <label className="f"><span>Shaadi ki anniversary (optional)</span>
              <input type="date" max={dstr()} value={cust.anniversary || ''} onChange={e => setCust({ ...cust, anniversary: e.target.value })} />
            </label>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 11 }}>
              <button className="btn" style={{ width: '100%' }} disabled={saving} onClick={() => saveDetails()}>{saving ? 'Saving…' : 'Details save karein'}</button>
            </div>
          </div>
        </>
      )}

      {cust && !isNew && (
        <div className="custfound">
          <div className="av">{(cust.name || '?').trim().charAt(0).toUpperCase() || '?'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{cust.name || 'Unnamed'}</b>{cust.kid ? <span className="hint"> · {cust.kid}</span> : null}
            <div className="hint">{cust.visits || 0} visits · {INR(cust.totalSpend || 0)} lifetime{cust.lastVisit ? ' · last ' + prettyDate(cust.lastVisit) : ''}</div>
            {(cust.points > 0 || cust.kidDob || cust.anniversary) && (
              <div className="hint">
                {[cust.points > 0 && cust.points + ' loyalty points', cust.kidDob && '🎂 ' + dayMonth(cust.kidDob), cust.anniversary && '💍 ' + dayMonth(cust.anniversary)].filter(Boolean).join(' · ')}
              </div>
            )}
            {cust.membership && (
              <div style={{ marginTop: 5 }}><span className={'badge' + (memberActive(cust) ? '' : ' warn')}>{memberLabel(cust)}</span></div>
            )}
          </div>
          <button className="btn sm ghost" onClick={() => setIsNew(true)}>Edit</button>
        </div>
      )}

      {cust && !isNew && !cust.kidDob && (
        <div className="row" style={{ marginTop: 10, alignItems: 'flex-end', padding: 10, borderRadius: 12, background: 'var(--accent-soft)' }}>
          <p className="hint" style={{ flex: '1 1 100%', margin: 0 }}>🎂 Bachche ka birthday abhi record me nahi hai — pooch ke daal dijiye{!cust.anniversary ? ' (anniversary bhi, agar batayein)' : ''}.</p>
          {!cust.kid && (
            <label className="f" style={{ margin: 0, flex: '1 1 130px' }}><span>Child name</span>
              <input type="text" value={quickKid} placeholder="Bachche ka naam" onChange={e => setQuickKid(e.target.value)} /></label>
          )}
          <label className="f" style={{ margin: 0, flex: '1 1 150px' }}><span>Birthday</span>
            <input type="date" max={dstr()} value={quickDob} onChange={e => setQuickDob(e.target.value)} /></label>
          {!cust.anniversary && (
            <label className="f" style={{ margin: 0, flex: '1 1 150px' }}><span>Anniversary</span>
              <input type="date" max={dstr()} value={quickAnn} onChange={e => setQuickAnn(e.target.value)} /></label>
          )}
          <button className="btn dark" style={{ flex: '0 0 auto' }} disabled={saving || (!quickDob && !quickAnn)}
            onClick={() => saveDetails({
              ...(quickDob ? { kidDob: quickDob } : {}),
              ...(quickAnn ? { anniversary: quickAnn } : {}),
              ...(quickKid.trim() ? { kid: quickKid.trim() } : {})
            })}>Save</button>
        </div>
      )}
    </>
  );
}
