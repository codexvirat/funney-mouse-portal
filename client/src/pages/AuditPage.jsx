import { useEffect, useState } from 'react';
import api from '../api/client';
import { addDays, dstr, prettyDate } from '../utils/date';

// Admin-only record of sensitive actions: voids, bill edits, discounts,
// cancelled tables/bookings, cash closing, settings and user changes.
export default function AuditPage() {
  const [from, setFrom] = useState(addDays(dstr(), -6));
  const [to, setTo] = useState(dstr());
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/audit', { params: { from, to } })
      .then(({ data }) => setLogs(data.logs))
      .finally(() => setLoading(false));
  }, [from, to]);

  const actions = [...new Set(logs.map(l => l.action))].sort();
  const shown = filter ? logs.filter(l => l.action === filter) : logs;

  return (
    <>
      <div className="card"><div className="bd">
        <div className="row">
          <label className="f" style={{ margin: 0 }}><span>From</span><input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
          <label className="f" style={{ margin: 0 }}><span>To</span><input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} /></label>
          <label className="f" style={{ margin: 0 }}><span>Kaam</span>
            <select value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="">Sab</option>
              {actions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
        </div>
      </div></div>

      <div className="card">
        <div className="hd"><h2>Activity log</h2><div className="spacer"></div><span className="hint">{shown.length} entries</span></div>
        <div className="bd scrollx">
          {loading ? <p className="hint">Loading…</p> : shown.length ? (
            <table className="tb">
              <thead><tr><th>Kab</th><th>Kisne</th><th>Kya</th><th>Details</th></tr></thead>
              <tbody>
                {shown.map(l => (
                  <tr key={l._id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{prettyDate(l.date).replace(/, \d{4}/, '')}<br />
                      <span className="hint">{new Date(l.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span></td>
                    <td>{l.user || '—'}</td>
                    <td><b>{l.action}</b></td>
                    <td>{l.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="empty"><b>Is period me kuch record nahi</b>Void, edit, discount, cancel jaise kaam yahan dikhenge.</div>}
        </div>
      </div>
    </>
  );
}
