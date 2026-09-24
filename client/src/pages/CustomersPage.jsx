import { useEffect, useState } from 'react';
import api from '../api/client';
import { INR } from '../utils/money';
import { prettyDate, dayMonth, dstr } from '../utils/date';
import { useConfig } from '../context/ConfigContext';
import { openWhatsApp } from '../utils/notify';
import MonthCalendar from '../components/MonthCalendar';

function years(since, date) {
  return Number(date.slice(0, 4)) - Number(since.slice(0, 4));
}

function ordinal(n) {
  const t = n % 100;
  if (t >= 11 && t <= 13) return n + 'th';
  return n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
}

// Calendar of kids' birthdays and anniversaries (by day-month, any year).
// Tapping a date lists that day's people with a ready WhatsApp wish.
function OccasionsCalendar({ onOpen }) {
  const { config } = useConfig();
  const shop = (config && config.shopName) || 'Funny Mouse';
  const [month, setMonth] = useState(dstr().slice(0, 7));
  const [selected, setSelected] = useState(dstr());
  const [list, setList] = useState(null);

  useEffect(() => {
    setList(null);
    api.get('/customers/occasions', { params: { month: month.slice(5) } })
      .then(({ data }) => setList(data.occasions))
      .catch(() => setList([]));
  }, [month]);

  const changeMonth = (m) => { setMonth(m); setSelected(null); };
  const byDay = {};
  (list || []).forEach(o => { (byDay[o.day] = byDay[o.day] || []).push(o); });
  const dayList = selected && selected.slice(0, 7) === month ? (byDay[selected.slice(8)] || []) : [];

  const wish = (o, date) => {
    const when = date === dstr() ? 'aaj' : dayMonth(date) + ' ko';
    const n = years(o.since, date);
    const text = o.type === 'birthday'
      ? `Namaste ${o.name || ''}! 🎉 ${shop} ki taraf se ${o.kid || 'aapke bachche'} ko ${when}${n > 0 ? ` ${ordinal(n)}` : ''} birthday ki dher saari badhaai! 🎂\n\nBirthday party ya special play ke liye ${shop} me aaiye — birthday kid ke liye special offer hai. Booking ke liye reply karein.`
      : `Namaste ${o.name || ''}! 💍 ${shop} ki taraf se aapko ${when}${n > 0 ? ` ${ordinal(n)}` : ''} wedding anniversary ki bahut bahut badhaai! 🎉\n\nFamily ke saath celebrate karne ${shop} aaiye — anniversary par special offer hai. Reply karke table book karein.`;
    openWhatsApp(o.phone, text);
  };

  const mark = (d) => {
    const items = byDay[d.slice(8)];
    if (!items) return null;
    const b = items.filter(o => o.type === 'birthday').length;
    const a = items.length - b;
    return <small className="calmark">{b ? '🎂' + (b > 1 ? b : '') : ''}{a ? '💍' + (a > 1 ? a : '') : ''}</small>;
  };

  const total = (list || []).length;

  return (
    <div className="card">
      <div className="hd"><h2>🎂 Birthday &amp; 💍 Anniversary calendar</h2><div className="spacer"></div>
        {list && <span className="hint">Is mahine {total}</span>}
      </div>
      <div className="bd">
        <MonthCalendar month={month} onMonth={changeMonth} selected={selected} onSelect={setSelected} renderMark={mark} />
        {list === null ? <p className="hint" style={{ margin: 0 }}>Loading…</p> : !selected ? (
          <p className="hint" style={{ margin: 0 }}>Kisi date par tap karein — us din ke birthday aur anniversary yahan dikhenge.</p>
        ) : !dayList.length ? (
          <p className="hint" style={{ margin: 0 }}>{prettyDate(selected)} ko koi birthday ya anniversary nahi.{!total ? ' Billing me customer ka "Child ka birthday" aur "Anniversary" bharte rahiye.' : ''}</p>
        ) : (
          <>
            <p className="hint" style={{ margin: '0 0 8px' }}>{prettyDate(selected)}</p>
            {dayList.map(o => (
              <div className="sess" key={o.type + o.phone}
                style={o.type === 'birthday' ? { background: 'var(--accent-soft)', borderColor: 'var(--accent)' } : { background: 'var(--berry-soft)', borderColor: 'var(--berry)' }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  {o.type === 'birthday'
                    ? <><b>🎂 {o.kid || 'Child'} ka birthday</b>{years(o.since, selected) > 0 ? <span className="hint"> · {years(o.since, selected)} saal</span> : null}</>
                    : <><b>💍 {o.name || 'Customer'} ki anniversary</b>{years(o.since, selected) > 0 ? <span className="hint"> · {years(o.since, selected)} saal</span> : null}</>}
                  <br /><span className="hint">{o.name || 'Parent'} · {o.phone}</span>
                </span>
                <button className="btn sm dark" onClick={() => wish(o, selected)}>WhatsApp wish</button>
                <button className="btn sm ghost" onClick={() => onOpen(o.phone)}>Details</button>
              </div>
            ))}
          </>
        )}
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
      <OccasionsCalendar onOpen={open} />

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
            <div className="hint" style={{ marginBottom: 10 }}>{cust.phone}{cust.kid ? ' · child: ' + cust.kid : ''}{cust.kidDob ? ' · 🎂 ' + dayMonth(cust.kidDob) : ''}{cust.anniversary ? ' · 💍 ' + dayMonth(cust.anniversary) : ''}</div>
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
