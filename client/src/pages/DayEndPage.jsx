import { useEffect, useState } from 'react';
import api from '../api/client';
import { INR } from '../utils/money';
import { dstr, prettyDate, tstr } from '../utils/date';
import { rollup } from '../utils/report';
import { exportCSV } from '../utils/csv';
import ReportBreakdown from '../components/ReportBreakdown';
import TableBreakdown from '../components/TableBreakdown';

function DayReport({ date, bills, t, onVoid, onSettle }) {
  return (
    <>
      <div className="hero"><small>{prettyDate(date)}</small><b>{INR(t.total)}</b>
        <div className="sub"><span>{t.bills} bills</span><span>{t.kids} kids</span>
          <span>Avg {INR(t.bills ? t.total / t.bills : 0)}</span>{t.disc > 0 && <span>Disc {INR(t.disc)}</span>}</div>
      </div>
      <ReportBreakdown t={t} />
      <TableBreakdown bills={bills} />
      <div className="card">
        <div className="hd"><h2>Bills</h2><div className="spacer"></div>
          <button className="btn sm" onClick={() => exportCSV(bills, date)}>Export CSV</button></div>
        <div className="bd scrollx">
          {bills.length ? (
            <table className="tb">
              <thead><tr><th>#</th><th>Time</th><th>Customer</th><th>Items</th><th style={{ textAlign: 'right' }}>Total</th><th>Mode</th><th></th></tr></thead>
              <tbody>
                {bills.map(b => (
                  <tr key={b._id} className={b.void ? 'void' : ''}>
                    <td>{b.no}</td><td>{tstr(b.ts)}</td>
                    <td>{b.name || 'Walk-in'}{b.phone ? <><br /><span className="hint">{b.phone}</span></> : null}</td>
                    <td>{b.items.map((i, ix) => (<span key={ix}>{i.name}{i.qty > 1 ? ' ×' + i.qty : ''}<br /></span>))}</td>
                    <td style={{ textAlign: 'right' }}><b className="num">{INR(b.total)}</b></td>
                    <td>{Object.entries(b.pay).filter(([, v]) => v > 0).map(([k, v]) => (<span key={k}>{k} {INR(v)}<br /></span>))}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {b.void ? <span className="hint">Void</span> : (
                        <>
                          {b.pay.DUE > 0 && <button className="btn sm" onClick={() => onSettle(b)}>Due paid</button>}{' '}
                          <button className="btn sm ghost" onClick={() => onVoid(b)}>Void</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="empty"><b>Is din koi bill nahi</b>Date badal kar dekhiye.</div>}
        </div>
      </div>
    </>
  );
}

function MonthReport({ month, bills, t }) {
  const byDay = {};
  bills.forEach(b => { if (!b.void) byDay[b.date] = (byDay[b.date] || 0) + b.total; });
  const keys = Object.keys(byDay).sort();
  const max = Math.max(1, ...Object.values(byDay));
  const label = new Date(month + '-01T00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  return (
    <>
      <div className="hero"><small>{label}</small><b>{INR(t.total)}</b>
        <div className="sub"><span>{t.bills} bills</span><span>{t.kids} kids</span><span>{keys.length} days open</span>
          <span>Avg/day {INR(keys.length ? t.total / keys.length : 0)}</span></div>
      </div>
      <ReportBreakdown t={t} />
      <TableBreakdown bills={bills} />
      <div className="card">
        <div className="hd"><h2>Day by day</h2><div className="spacer"></div>
          <button className="btn sm" onClick={() => exportCSV(bills, month)}>Export CSV</button></div>
        <div className="bd">
          {keys.length ? keys.map(k => (
            <div className="brk" key={k}>
              <div className="t"><span>{prettyDate(k).replace(/, \d{4}/, '')}</span><b>{INR(byDay[k])}</b></div>
              <div className="bar"><i style={{ width: Math.round(byDay[k] / max * 100) + '%', background: 'var(--text)' }}></i></div>
            </div>
          )) : <div className="empty"><b>Is mahine ka data nahi</b>Bills banne ke baad yahan dikhega.</div>}
        </div>
      </div>
    </>
  );
}

export default function DayEndPage() {
  const [mode, setMode] = useState('day');
  const [date, setDate] = useState(dstr());
  const [month, setMonth] = useState(dstr().slice(0, 7));
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/bills', { params: mode === 'day' ? { date } : { month } });
      setBills(data.bills);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [mode, date, month]);

  const voidBill = async (b) => {
    if (!window.confirm('Ye bill void kar dein? Sale total se hat jayegi.')) return;
    const reason = window.prompt('Reason (optional)') || '';
    try { await api.patch(`/bills/${b._id}/void`, { reason }); load(); } catch (e) { alert('Void nahi ho paya'); }
  };
  const settleDue = async (b) => {
    const modeIn = window.prompt('Due kis mode me mila? UPI / CASH / CARD', 'UPI');
    if (!modeIn) return;
    try { await api.patch(`/bills/${b._id}/settle-due`, { mode: modeIn }); load(); }
    catch (e) { alert((e.response && e.response.data && e.response.data.message) || 'Settle nahi hua'); }
  };

  const t = rollup(bills);

  return (
    <>
      <div className="card"><div className="bd">
        <div className="seg" style={{ marginBottom: 12 }}>
          <button aria-pressed={mode === 'day'} onClick={() => setMode('day')}>One day</button>
          <button aria-pressed={mode === 'month'} onClick={() => setMode('month')}>Month</button>
        </div>
        {mode === 'day' ? (
          <div className="row">
            <input type="date" style={{ flex: '2 1 160px' }} value={date} onChange={e => setDate(e.target.value)} />
            <button className="btn" style={{ flex: '0 0 auto' }} onClick={() => setDate(dstr())}>Today</button>
          </div>
        ) : (
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} />
        )}
      </div></div>

      {loading ? <p className="hint">Loading…</p> : mode === 'day'
        ? <DayReport date={date} bills={bills} t={t} onVoid={voidBill} onSettle={settleDue} />
        : <MonthReport month={month} bills={bills} t={t} />}
    </>
  );
}
