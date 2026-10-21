import { useEffect, useState } from 'react';
import { INR } from '../utils/money';
import { prettyDate } from '../utils/date';

// All advance money at a glance — shown on both the admin Day-end screen and
// the owner portal. `api` is whichever axios client the screen logs in with.
// `adjusted` is the advance already netted into bills for the period (from
// the report rollup); `sale` is the period's billed sale, for the expected
// total. `en` gives English labels (owner portal).
export default function AdvanceCard({ api, from, to, adjusted = 0, sale = 0, en = false }) {
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
  const { estimate, received, pending, later, openTables, unbilledEstimate } = data;
  // Billed parties are already in the sale, so only the unbilled ones' estimate is added.
  const expected = sale + unbilledEstimate.total;
  const plural = (k, w) => `${k} ${k === 1 ? w : w === 'party' ? 'parties' : w + 's'}`;
  // Every party counts in the period of its own date — its advance and
  // estimate both — however early the booking was made.
  const tiles = [
    [en ? "Estimate for this period's parties" : 'Is period ki parties ka estimate', estimate.total, `${plural(estimate.list.length, 'party')} · ${en ? 'after advance' : 'advance ke baad'} ${INR(Math.max(0, estimate.total - received.total))}`],
    [en ? "Advance for this period's parties" : 'Is period ki parties ka advance', received.total, plural(received.count, 'booking')],
    [en ? 'Adjusted in bills' : 'Bills me adjust hui', adjusted, en ? "this period's bills" : 'is period ke bills'],
    [en ? 'Of these, not billed yet' : 'Inme abhi bill baaki', pending.total, plural(pending.list.length, 'booking')],
    [en ? 'Advance on later parties' : 'Aage ki parties pe advance', later.total, plural(later.list.length, 'booking')],
    [en ? 'On open tables now' : 'Abhi open tables pe', openTables.total, plural(openTables.list.length, 'table')]
  ];
  const hasList = estimate.list.length > 0 || later.list.length > 0 || openTables.list.length > 0;
  const partyTable = (list) => (
    <div className="scrollx" style={{ marginTop: 14 }}>
      <table className="tb">
        <thead><tr><th>Party date</th><th>Name</th><th>Guests</th><th style={{ textAlign: 'right' }}>Estimate</th><th style={{ textAlign: 'right' }}>Advance</th></tr></thead>
        <tbody>
          {list.map(b => (
            <tr key={b._id}>
              <td>{prettyDate(b.eventDate)}{b.status === 'used' ? <><br /><span className="hint">Billed</span></> : null}</td>
              <td>{b.name || 'Walk-in'}{b.phone ? <><br /><span className="hint">{b.phone}</span></> : null}</td>
              <td>{b.guests || '—'}</td>
              <td style={{ textAlign: 'right' }}>{b.estimate ? <b className="num">{INR(b.estimate)}</b> : <span className="hint">—</span>}</td>
              <td style={{ textAlign: 'right' }}>{b.advance ? <><b className="num">{INR(b.advance)}</b> <span className="hint">({b.advanceMode})</span></> : <span className="hint">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="card">
      <div className="hd"><h2>Parties: estimate &amp; advance</h2><div className="spacer"></div>
        {hasList && <button className="btn sm ghost" onClick={() => setOpen(o => !o)}>{open ? 'Hide' : 'Details'}</button>}
      </div>
      <div className="bd">
        <div className="advtile" style={{ marginBottom: 10 }}>
          <span className="hint">{en ? 'Overall (sales + party estimates)' : 'Overall (sale + parties ka estimate)'}</span>
          <b className="num">{INR(expected)}</b>
          <span className="hint">{en ? 'Sales' : 'Sale'} {INR(sale)} + {plural(unbilledEstimate.count, 'party')} {en ? 'not billed yet' : 'jinka bill baaki'} {INR(unbilledEstimate.total)}</span>
        </div>
        <div className="advgrid">
          {tiles.map(([label, amt, sub]) => (
            <div className="advtile" key={label}>
              <span className="hint">{label}</span>
              <b className="num">{INR(amt)}</b>
              <span className="hint">{sub}</span>
            </div>
          ))}
        </div>

        {open && estimate.list.length > 0 && <><h3 className="hint" style={{ margin: '14px 0 0' }}>{en ? "This period's parties" : 'Is period ki parties'}</h3>{partyTable(estimate.list)}</>}
        {open && later.list.length > 0 && <><h3 className="hint" style={{ margin: '14px 0 0' }}>{en ? 'Later parties' : 'Aage ki parties'}</h3>{partyTable(later.list)}</>}
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
