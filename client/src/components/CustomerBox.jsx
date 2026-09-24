import { useState } from 'react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { INR } from '../utils/money';
import { prettyDate, dayMonth } from '../utils/date';
import { memberActive, memberLabel } from '../utils/member';

export default function CustomerBox({ phone, setPhone, cust, setCust, isNew, setIsNew, onFind, onWalkin }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  // Saved straight away (not only at billing) so the child's birthday is
  // on record for the birthday list even if this visit is never billed.
  const saveDetails = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch('/customers/' + cust.phone, { name: cust.name, kid: cust.kid, kidDob: cust.kidDob || '' });
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
            <div className="av">+</div>
            <div><b>New customer</b><br /><span className="hint">Naam bhar dijiye, aage se phone se aa jayega</span></div>
          </div>
          <div className="grid2">
            <label className="f"><span>Parent / customer name</span>
              <input type="text" value={cust.name} placeholder="Name" onChange={e => setCust({ ...cust, name: e.target.value })} />
            </label>
            <label className="f"><span>Child name (optional)</span>
              <input type="text" value={cust.kid} placeholder="Bachche ka naam" onChange={e => setCust({ ...cust, kid: e.target.value })} />
            </label>
            <label className="f"><span>Child ka birthday (optional)</span>
              <input type="date" value={cust.kidDob || ''} onChange={e => setCust({ ...cust, kidDob: e.target.value })} />
            </label>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 11 }}>
              <button className="btn" style={{ width: '100%' }} disabled={saving} onClick={saveDetails}>{saving ? 'Saving…' : 'Details save karein'}</button>
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
            {(cust.points > 0 || cust.kidDob) && (
              <div className="hint">{cust.points > 0 ? cust.points + ' loyalty points' : ''}{cust.points > 0 && cust.kidDob ? ' · ' : ''}{cust.kidDob ? 'Birthday ' + dayMonth(cust.kidDob) : ''}</div>
            )}
            {cust.membership && (
              <div style={{ marginTop: 5 }}><span className={'badge' + (memberActive(cust) ? '' : ' warn')}>{memberLabel(cust)}</span></div>
            )}
          </div>
          <button className="btn sm ghost" onClick={() => setIsNew(true)}>Edit</button>
        </div>
      )}
    </>
  );
}
