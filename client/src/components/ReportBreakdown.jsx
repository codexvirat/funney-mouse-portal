import { INR } from '../utils/money';

export default function ReportBreakdown({ t }) {
  const max = Math.max(t.food, t.play, t.socks, t.member, 1);
  const rows = [['Play area', 'play', 'var(--grape)'], ['Food', 'food', 'var(--berry)'], ['Socks', 'socks', 'var(--mint)'], ['Membership', 'member', 'var(--accent)']];
  const pays = [['UPI', 'UPI', 'var(--grape)'], ['Cash', 'CASH', 'var(--mint)'], ['Card', 'CARD', 'var(--sky)'], ['Due / udhaar', 'DUE', 'var(--berry)']];
  const pmax = Math.max(t.UPI, t.CASH, t.CARD, t.DUE, 1);
  return (
    <div className="grid2">
      <div className="card"><div className="hd"><h2>Kis cheez se kitni sale</h2></div><div className="bd">
        {rows.map(([l, k, c]) => (
          <div className="brk" key={k}>
            <div className="t"><span>{l}</span><b>{INR(t[k] || 0)}</b></div>
            <div className="bar"><i style={{ width: Math.round((t[k] || 0) / max * 100) + '%', background: c }}></i></div>
          </div>
        ))}
        {t.memberPlayMins > 0 && <p className="hint" style={{ margin: '10px 0 0' }}>Member play (free): {Math.round(t.memberPlayMins / 60 * 10) / 10} kid-hours</p>}
        {(t.cgst > 0 || t.sgst > 0) && (
          <div style={{ marginTop: 12, paddingTop: 11, borderTop: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="hint">CGST</span><b className="num">{INR(t.cgst)}</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}><span className="hint">SGST</span><b className="num">{INR(t.sgst)}</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}><span className="hint">Total GST</span><b className="num">{INR(t.cgst + t.sgst)}</b></div>
          </div>
        )}
        {t.advance > 0 && (
          <div style={{ marginTop: 12, paddingTop: 11, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between' }}>
            <span className="hint">Advance collected</span><b className="num">{INR(t.advance)}</b>
          </div>
        )}
      </div></div>
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
    </div>
  );
}
