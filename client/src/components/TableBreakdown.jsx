import { INR } from '../utils/money';
import { tableRollup } from '../utils/report';

export default function TableBreakdown({ bills }) {
  const rows = tableRollup(bills);
  if (!rows.length) return null;
  return (
    <div className="card">
      <div className="hd"><h2>Table-wise</h2></div>
      <div className="bd scrollx">
        <table className="tb">
          <thead><tr><th>Table</th><th>Bills</th><th style={{ textAlign: 'right' }}>Revenue</th><th style={{ textAlign: 'right' }}>Avg time</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td>{r.bills}</td>
                <td style={{ textAlign: 'right' }}><b className="num">{INR(r.revenue)}</b></td>
                <td style={{ textAlign: 'right' }}>{r.bills ? Math.round(r.totalMins / r.bills) : 0} min</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
