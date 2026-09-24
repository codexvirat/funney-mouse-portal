import { useEffect, useState } from 'react';
import { useOwnerAuth } from '../context/OwnerAuthContext';
import { INR } from '../utils/money';
import { dstr, prettyDate, tstr, addMonths, weekRange } from '../utils/date';
import { rollup } from '../utils/report';
import { exportCSV } from '../utils/csv';
import ReportBreakdown from '../components/ReportBreakdown';
import TableBreakdown from '../components/TableBreakdown';
import WaiterBreakdown from '../components/WaiterBreakdown';
import ProfitCard from '../components/ProfitCard';

function PendingBookings({ api }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get('/bookings', { params: { status: 'pending' } })
      .then(({ data }) => { if (!cancelled) setBookings(data.bookings); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !bookings.length) return null;
  const totalAdvance = bookings.reduce((a, b) => a + (b.advance || 0), 0);

  return (
    <div className="card">
      <div className="hd"><h2>Advance / token bookings pending</h2><div className="spacer"></div>
        <span className="hint">{bookings.length} · {INR(totalAdvance)} advance liya hua</span></div>
      <div className="bd scrollx">
        <table className="tb">
          <thead><tr><th>Event date</th><th>Name</th><th>Guests</th><th style={{ textAlign: 'right' }}>Advance</th></tr></thead>
          <tbody>
            {bookings.map(b => (
              <tr key={b._id}>
                <td>{prettyDate(b.eventDate)}</td>
                <td>{b.name || 'Walk-in'}{b.phone ? <><br /><span className="hint">{b.phone}</span></> : null}</td>
                <td>{b.guests || '—'}</td>
                <td style={{ textAlign: 'right' }}><b className="num">{INR(b.advance)}</b> <span className="hint">({b.advanceMode})</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function heroSub(t, extra) {
  return (
    <div className="sub">
      <span>{t.bills} bills</span><span>{t.kids} kids</span>
      {extra}
      {t.disc > 0 && <span>Disc {INR(t.disc)}</span>}
      {(t.cgst > 0 || t.sgst > 0) && <span>GST {INR(t.cgst + t.sgst)}</span>}
      {t.advance > 0 && <span>Advance {INR(t.advance)}</span>}
    </div>
  );
}

function DayReport({ date, bills, t, expenses }) {
  return (
    <>
      <div className="hero"><small>{prettyDate(date)}</small><b>{INR(t.total)}</b>
        {heroSub(t, <span>Avg {INR(t.bills ? t.total / t.bills : 0)}</span>)}
      </div>
      <ReportBreakdown t={t} />
      <ProfitCard t={t} expenses={expenses} />
      <TableBreakdown bills={bills} />
      <WaiterBreakdown bills={bills} />
      <div className="card">
        <div className="hd"><h2>Bills</h2><div className="spacer"></div>
          <button className="btn sm" onClick={() => exportCSV(bills, date)}>Export CSV</button></div>
        <div className="bd scrollx">
          {bills.length ? (
            <table className="tb">
              <thead><tr><th>#</th><th>Time</th><th>Customer</th><th>Items</th><th style={{ textAlign: 'right' }}>Total</th><th>Mode</th></tr></thead>
              <tbody>
                {bills.map(b => (
                  <tr key={b._id} className={b.void ? 'void' : ''}>
                    <td>{b.no}</td><td>{tstr(b.ts)}</td>
                    <td>{b.name || 'Walk-in'}{b.phone ? <><br /><span className="hint">{b.phone}</span></> : null}
                      {b.advance > 0 && <><br /><span className="hint">Advance {INR(b.advance)}</span></>}
                      {b.editedAt && <><br /><span className="hint">Edited</span></>}</td>
                    <td>{b.items.map((i, ix) => (<span key={ix}>{i.name}{i.qty > 1 ? ' ×' + i.qty : ''}<br /></span>))}</td>
                    <td style={{ textAlign: 'right' }}><b className="num">{INR(b.total)}</b></td>
                    <td>{b.void ? <span className="hint">Void</span> : Object.entries(b.pay).filter(([, v]) => v > 0).map(([k, v]) => (<span key={k}>{k} {INR(v)}<br /></span>))}</td>
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

// Generic "day by day" report for any date range — powers Week, Month,
// Last 3 Months, Year and Custom range modes alike.
function RangeReport({ label, bills, t, filename, expenses }) {
  const byDay = {};
  bills.forEach(b => { if (!b.void) byDay[b.date] = (byDay[b.date] || 0) + b.total; });
  const keys = Object.keys(byDay).sort();
  const max = Math.max(1, ...Object.values(byDay));
  return (
    <>
      <div className="hero"><small>{label}</small><b>{INR(t.total)}</b>
        {heroSub(t, <><span>{keys.length} days open</span><span>Avg/day {INR(keys.length ? t.total / keys.length : 0)}</span></>)}
      </div>
      <ReportBreakdown t={t} />
      <ProfitCard t={t} expenses={expenses} />
      <TableBreakdown bills={bills} />
      <WaiterBreakdown bills={bills} />
      <div className="card">
        <div className="hd"><h2>Day by day</h2><div className="spacer"></div>
          <button className="btn sm" onClick={() => exportCSV(bills, filename)}>Export CSV</button></div>
        <div className="bd">
          {keys.length ? keys.map(k => (
            <div className="brk" key={k}>
              <div className="t"><span>{prettyDate(k).replace(/, \d{4}/, '')}</span><b>{INR(byDay[k])}</b></div>
              <div className="bar"><i style={{ width: Math.round(byDay[k] / max * 100) + '%', background: 'var(--text)' }}></i></div>
            </div>
          )) : <div className="empty"><b>Is period ka data nahi</b>Bills banne ke baad yahan dikhega.</div>}
        </div>
      </div>
    </>
  );
}

const MODES = [
  { key: 'day', label: 'Din' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'quarter', label: '3 Months' },
  { key: 'year', label: 'Year' },
  { key: 'range', label: 'Custom' }
];

export default function OwnerReportsPage() {
  const { api } = useOwnerAuth();
  const [mode, setMode] = useState('day');
  const [date, setDate] = useState(dstr());
  const [month, setMonth] = useState(dstr().slice(0, 7));
  const [weekAnchor, setWeekAnchor] = useState(dstr());
  const [year, setYear] = useState(new Date().getFullYear());
  const [rangeFrom, setRangeFrom] = useState(addMonths(dstr(), -1));
  const [rangeTo, setRangeTo] = useState(dstr());
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState(null);

  const wk = weekRange(weekAnchor);
  const quarterTo = dstr();
  const quarterFrom = addMonths(quarterTo, -3);

  const load = async () => {
    setLoading(true);
    try {
      let params;
      if (mode === 'day') params = { date };
      else if (mode === 'month') params = { month };
      else if (mode === 'week') params = { from: wk.from, to: wk.to };
      else if (mode === 'quarter') params = { from: quarterFrom, to: quarterTo };
      else if (mode === 'year') params = { from: year + '-01-01', to: year + '-12-31' };
      else params = { from: rangeFrom, to: rangeTo };
      const range = params.date ? { from: params.date, to: params.date } : params.month ? { from: params.month + '-01', to: params.month + '-31' } : params;
      const [billsRes, expRes] = await Promise.all([
        api.get('/bills', { params }),
        api.get('/cash/expenses', { params: range }).catch(() => null)
      ]);
      setBills(billsRes.data.bills);
      setExpenses(expRes ? expRes.data.expenses : null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [mode, date, month, weekAnchor, year, rangeFrom, rangeTo]);

  const t = rollup(bills);

  let report;
  if (mode === 'day') {
    report = <DayReport date={date} bills={bills} t={t} expenses={expenses} />;
  } else if (mode === 'month') {
    const label = new Date(month + '-01T00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    report = <RangeReport label={label} bills={bills} t={t} expenses={expenses} filename={month} />;
  } else if (mode === 'week') {
    report = <RangeReport label={`${prettyDate(wk.from).replace(/, \d{4}/, '')} – ${prettyDate(wk.to)}`} bills={bills} t={t} expenses={expenses} filename={wk.from + '_to_' + wk.to} />;
  } else if (mode === 'quarter') {
    report = <RangeReport label={`Last 3 mahine (${prettyDate(quarterFrom).replace(/, \d{4}/, '')} – ${prettyDate(quarterTo)})`} bills={bills} t={t} expenses={expenses} filename={quarterFrom + '_to_' + quarterTo} />;
  } else if (mode === 'year') {
    report = <RangeReport label={String(year)} bills={bills} t={t} expenses={expenses} filename={String(year)} />;
  } else {
    report = <RangeReport label={`${prettyDate(rangeFrom).replace(/, \d{4}/, '')} – ${prettyDate(rangeTo)}`} bills={bills} t={t} expenses={expenses} filename={rangeFrom + '_to_' + rangeTo} />;
  }

  return (
    <>
      <PendingBookings api={api} />

      <div className="card"><div className="bd">
        <div className="seg" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
          {MODES.map(m => (
            <button key={m.key} aria-pressed={mode === m.key} onClick={() => setMode(m.key)}>{m.label}</button>
          ))}
        </div>

        {mode === 'day' && (
          <div className="row">
            <input type="date" style={{ flex: '2 1 160px' }} value={date} onChange={e => setDate(e.target.value)} />
            <button className="btn" style={{ flex: '0 0 auto' }} onClick={() => setDate(dstr())}>Today</button>
          </div>
        )}
        {mode === 'month' && (
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} />
        )}
        {mode === 'week' && (
          <div className="row">
            <input type="date" style={{ flex: '2 1 160px' }} value={weekAnchor} onChange={e => setWeekAnchor(e.target.value)} />
            <button className="btn" style={{ flex: '0 0 auto' }} onClick={() => setWeekAnchor(dstr())}>Is hafte</button>
          </div>
        )}
        {mode === 'quarter' && (
          <p className="hint" style={{ margin: 0 }}>Pichle 3 mahine ka rolling data — {prettyDate(quarterFrom)} se {prettyDate(quarterTo)} tak.</p>
        )}
        {mode === 'year' && (
          <input type="number" value={year} style={{ maxWidth: 140 }} onChange={e => setYear(Number(e.target.value) || new Date().getFullYear())} />
        )}
        {mode === 'range' && (
          <div className="row">
            <label className="f" style={{ margin: 0, flex: '1 1 140px' }}><span>From</span>
              <input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} /></label>
            <label className="f" style={{ margin: 0, flex: '1 1 140px' }}><span>To</span>
              <input type="date" value={rangeTo} min={rangeFrom} onChange={e => setRangeTo(e.target.value)} /></label>
          </div>
        )}
      </div></div>

      {loading ? <p className="hint">Loading…</p> : report}
    </>
  );
}
