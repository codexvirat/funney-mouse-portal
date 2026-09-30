import { INR } from '../utils/money';

const CATS = [
  ['Food', 'food', 'var(--berry)'],
  ['Play area', 'play', 'var(--grape)'],
  ['Party — Food', 'party', 'var(--sky)'],
  ['Party — Play', 'partyplay', 'var(--grape)'],
  ['Socks', 'socks', 'var(--mint)'],
  ['Membership', 'member', 'var(--accent)']
];
const MODES = [['UPI', 'UPI'], ['Cash', 'CASH'], ['Card', 'CARD'], ['Due', 'DUE']];
const ZERO = { total: 0, UPI: 0, CASH: 0, CARD: 0, DUE: 0 };

// Per category: what it brought in (its share of the bill totals, GST and
// service charge included) and how that was paid. Rows add up to the total.
export default function ReportBreakdown({ t }) {
  const byCat = t.byCat || {};
  const rows = CATS.map(([label, k, color]) => ({ label, k, color, ...ZERO, ...(byCat[k] || {}) }));
  const max = Math.max(1, ...rows.map(r => r.total));
  const pays = [['UPI', 'UPI', 'var(--grape)'], ['Cash', 'CASH', 'var(--mint)'], ['Card', 'CARD', 'var(--sky)'], ['Due / udhaar', 'DUE', 'var(--berry)']];
  const pmax = Math.max(t.UPI, t.CASH, t.CARD, t.DUE, 1);
  const cell = { textAlign: 'right', whiteSpace: 'nowrap' };
  return (
    <>
      <div className="card"><div className="hd"><h2>Kis cheez se kitni sale — payment mode ke saath</h2></div><div className="bd scrollx">
        <table className="tb">
          <thead><tr><th>Category</th>{MODES.map(([l]) => <th key={l} style={cell}>{l}</th>)}<th style={cell}>Total</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.k} style={r.total ? undefined : { opacity: 0.5 }}>
                <td style={{ minWidth: 120 }}>
                  <span className={'dot d-' + r.k} style={{ display: 'inline-block', marginRight: 7 }}></span>{r.label}
                  <div className="bar" style={{ height: 6 }}><i style={{ width: Math.round(r.total / max * 100) + '%', background: r.color }}></i></div>
                </td>
                {MODES.map(([l, m]) => <td key={m} style={cell}>{r[m] ? INR(r[m]) : '—'}</td>)}
                <td style={cell}><b className="num">{INR(r.total)}</b></td>
              </tr>
            ))}
            <tr>
              <td><b>Total</b></td>
              {MODES.map(([l, m]) => <td key={m} style={cell}><b className="num">{INR(t[m])}</b></td>)}
              <td style={cell}><b className="num">{INR(t.total)}</b></td>
            </tr>
          </tbody>
        </table>
        <p className="hint" style={{ margin: '10px 0 0', fontSize: 12 }}>Ek bill me kai cheezein ho to uska payment har cheez ke hisse ke hisaab se baanta gaya hai (GST / service charge shamil).</p>
        {t.memberPlayMins > 0 && <p className="hint" style={{ margin: '10px 0 0' }}>Member play (free): {Math.round(t.memberPlayMins / 60 * 10) / 10} kid-hours</p>}
      </div></div>

      <div className="grid2">
        <div className="card"><div className="hd"><h2>Payment mode</h2></div><div className="bd">
          {pays.map(([l, k, c]) => (
            <div className="brk" key={k}>
              <div className="t"><span>{l}</span><b>{INR(t[k] || 0)}</b></div>
              <div className="bar"><i style={{ width: Math.round((t[k] || 0) / pmax * 100) + '%', background: c }}></i></div>
            </div>
          ))}
          <div style={{ marginTop: 12, paddingTop: 11, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between' }}>
            <span className="hint">Cash in drawer</span><b className="num">{INR(t.CASH)}</b>
          </div>
        </div></div>
        <div className="card"><div className="hd"><h2>Tax, charges & advance</h2></div><div className="bd">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="hint">CGST</span><b className="num">{INR(t.cgst)}</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}><span className="hint">SGST</span><b className="num">{INR(t.sgst)}</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}><span className="hint">Total GST (food)</span><b className="num">{INR(t.cgst + t.sgst)}</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 11, borderTop: '1px solid var(--line)' }}><span className="hint">Service charge</span><b className="num">{INR(t.service)}</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 11, borderTop: '1px solid var(--line)' }}><span className="hint">Advance collected</span><b className="num">{INR(t.advance)}</b></div>
          {t.disc > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}><span className="hint">Discount diya</span><b className="num">{INR(t.disc)}</b></div>}
        </div></div>
      </div>
    </>
  );
}
