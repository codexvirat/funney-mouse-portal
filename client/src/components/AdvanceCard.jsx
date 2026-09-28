import { useEffect, useState } from 'react';
import { INR } from '../utils/money';
import { prettyDate } from '../utils/date';

// All advance money at a glance — shown on both the admin Day-end screen and
// the owner portal. `api` is whichever axios client the screen logs in with.
// `adjusted` is the advance already netted into bills for the period (from
// the report rollup).
export default function AdvanceCard({ api, from, to, adjusted = 0 }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get('/bookings/advance-summary', { params: { from, to } })
      .then(({ data: d }) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData(null); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  if (!data) return null;
  const { pending, openTables, received } = data;
  const tiles = [
    ['Is period me li gayi', received.total, `${received.count} booking${received.count === 1 ? '' : 's'}`],
    ['Bills me adjust hui', adjusted, 'is period ke bills'],
    ['Future bookings pe pending', pending.total, `${pending.list.length} booking${pending.list.length === 1 ? '' : 's'}`],
    ['Abhi open tables pe', openTables.total, `${openTables.list.length} table${openTables.list.length === 1 ? '' : 's'}`]
  ];
  const hasList = pending.list.length > 0 || openTables.list.length > 0;

  return (
    <div className="card">
      <div className="hd"><h2>Advance amount</h2><div className="spacer"></div>
        {hasList && <button className="btn sm ghost" onClick={() => setOpen(o => !o)}>{open ? 'Hide' : 'Details'}</button>}
      </div>
      <div className="bd">
        <div className="advgrid">
          {tiles.map(([label, amt, sub]) => (
            <div className="advtile" key={label}>
              <span className="hint">{label}</span>
              <b className="num">{INR(amt)}</b>
              <span className="hint">{sub}</span>
            </div>
          ))}
        </div>

        {open && pending.list.length > 0 && (
          <div className="scrollx" style={{ marginTop: 14 }}>
            <table className="tb">
              <thead><tr><th>Event date</th><th>Name</th><th>Guests</th><th style={{ textAlign: 'right' }}>Advance</th></tr></thead>
              <tbody>
                {pending.list.map(b => (
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
        )}
        {open && openTables.list.length > 0 && (
          <div className="scrollx" style={{ marginTop: 14 }}>
            <table className="tb">
              <thead><tr><th>Table</th><th>Name</th><th style={{ textAlign: 'right' }}>Advance</th></tr></thead>
              <tbody>
                {openTables.list.map(o => (
                  <tr key={o._id}>
                    <td>{o.tableName}</td>
                    <td>{o.name || 'Walk-in'}</td>
                    <td style={{ textAlign: 'right' }}><b className="num">{INR(o.advance)}</b> <span className="hint">({o.advanceMode})</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
