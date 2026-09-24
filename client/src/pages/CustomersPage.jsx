import { useEffect, useState } from 'react';
import api from '../api/client';
import { INR } from '../utils/money';
import { prettyDate, dayMonth } from '../utils/date';
import { useConfig } from '../context/ConfigContext';
import { openWhatsApp } from '../utils/notify';

function BirthdaysCard({ onOpen }) {
  const { config } = useConfig();
  const [days, setDays] = useState(7);
  const [list, setList] = useState(null);
  const shop = (config && config.shopName) || 'Funny Mouse';

  useEffect(() => {
    api.get('/customers/birthdays', { params: { days } }).then(({ data }) => setList(data.birthdays)).catch(() => setList([]));
  }, [days]);

  const wish = (b) => {
    const kid = b.kid || 'aapke bachche';
    openWhatsApp(b.phone, `Namaste ${b.name || ''}! 🎉 ${shop} ki taraf se ${kid} ko ${b.inDays === 0 ? 'aaj' : dayMonth(b.date) + ' ko'} birthday ki advance me dher saari badhaai! 🎂\n\nBirthday party ya special play ke liye ${shop} me aaiye — birthday kid ke liye special offer hai. Booking ke liye reply karein.`);
  };

  return (
    <div className="card">
      <div className="hd"><h2>🎂 Aane wale birthdays</h2><div className="spacer"></div>
        <select value={days} onChange={e => setDays(Number(e.target.value))} style={{ width: 'auto', padding: '6px 10px' }}>
          <option value={7}>7 din</option><option value={15}>15 din</option><option value={30}>30 din</option>
        </select>
      </div>
      <div className="bd">
        {list === null ? <p className="hint" style={{ margin: 0 }}>Loading…</p> : !list.length ? (
          <p className="hint" style={{ margin: 0 }}>Is period me koi birthday nahi. Bill banate waqt customer me "Child ka birthday" bhar dijiye.</p>
        ) : list.map(b => (
          <div className="sess" key={b.phone} style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent)' }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <b>{b.kid || 'Child'}</b>{b.age > 0 ? <span className="hint"> · {b.age} saal</span> : null}<br />
              <span className="hint">{b.inDays === 0 ? 'Aaj!' : b.inDays === 1 ? 'Kal' : dayMonth(b.date) + ' (' + b.inDays + ' din me)'} · {b.name || 'Parent'} · {b.phone}</span>
            </span>
            <button className="btn sm dark" onClick={() => wish(b)}>WhatsApp wish</button>
            <button className="btn sm ghost" onClick={() => onOpen(b.phone)}>Details</button>
          </div>
        ))}
      </div>
    </div>
  );
}

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

  const open = (p) => { setQ(p); search(p); };

  return (
    <>
      <BirthdaysCard onOpen={open} />

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
              {cust.points > 0 && <div className="stat"><small>Loyalty points</small><b>{cust.points}</b></div>}
            </div>
            <div className="hint" style={{ marginBottom: 10 }}>{cust.phone}{cust.kid ? ' · child: ' + cust.kid : ''}{cust.kidDob ? ' · birthday ' + dayMonth(cust.kidDob) : ''}</div>
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
