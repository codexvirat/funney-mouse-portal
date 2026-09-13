import { useEffect, useState } from 'react';
import api from '../api/client';
import { INR } from '../utils/money';
import { prettyDate } from '../utils/date';

export default function CustomersPage({ initialQuery, onBillThis, onMemThis }) {
  const [q, setQ] = useState(initialQuery || '');
  const [cust, setCust] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const search = async (p) => {
    if (p.length !== 10) { setCust(null); setNotFound(false); return; }
    try {
      const { data } = await api.get('/customers/' + p);
      if (data.customer) { setCust(data.customer); setNotFound(false); } else { setCust(null); setNotFound(true); }
    } catch (e) {
      setCust(null); setNotFound(true);
    }
  };

  useEffect(() => { if (initialQuery) search(initialQuery); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [initialQuery]);

  return (
    <>
      <div className="card"><div className="bd">
        <label className="f" style={{ margin: 0 }}><span>Phone number se dhoondhein</span>
          <input type="tel" inputMode="numeric" maxLength={10} placeholder="10 digit number" value={q}
            onChange={e => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 10);
              setQ(v);
              if (v.length === 10) search(v); else { setCust(null); setNotFound(false); }
            }} />
        </label>
      </div></div>

      {notFound && <div className="card"><div className="empty"><b>Koi record nahi mila</b>Nayi entry bill banate waqt ban jayegi.</div></div>}

      {cust && (
        <div className="card">
          <div className="hd"><h2>{cust.name || 'Unnamed'}</h2><div className="spacer"></div>
            <button className="btn sm" onClick={() => onMemThis(cust.phone)}>{cust.membership ? 'Renew plan' : 'Member banao'}</button>
            <button className="btn sm dark" onClick={() => onBillThis(cust)}>Bill banao</button>
          </div>
          <div className="bd">
            <div className="stats" style={{ marginBottom: 14 }}>
              <div className="stat"><small>Visits</small><b>{cust.visits || 0}</b></div>
              <div className="stat"><small>Lifetime spend</small><b>{INR(cust.totalSpend || 0)}</b></div>
              <div className="stat"><small>Last visit</small><b style={{ fontSize: 15 }}>{cust.lastVisit ? prettyDate(cust.lastVisit).replace(/, \d{4}/, '') : '—'}</b></div>
            </div>
            <div className="hint" style={{ marginBottom: 10 }}>{cust.phone}{cust.kid ? ' · child: ' + cust.kid : ''}</div>
            {cust.membership && (
              <div className="custfound" style={{ marginBottom: 14, background: 'var(--grape-soft)', borderColor: 'var(--grape)' }}>
                <div className="av" style={{ background: 'var(--grape)' }}>M</div>
                <div><b>{cust.membership.planName}</b>
                  <div className="hint">{cust.membership.hours > 0 ? cust.membership.hoursLeft + ' hr left' : 'Unlimited'} · valid till {cust.membership.expiresAt}</div>
                </div>
              </div>
            )}
            <h3 style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500, margin: '0 0 8px' }}>Recent visits</h3>
            {(cust.recent || []).length ? (
              <table className="tb"><tbody>
                {cust.recent.map((r, ix) => (<tr key={ix}><td>{prettyDate(r.date)}</td><td style={{ textAlign: 'right' }}><b className="num">{INR(r.total)}</b></td></tr>))}
              </tbody></table>
            ) : <p className="hint">—</p>}
          </div>
        </div>
      )}
    </>
  );
}
