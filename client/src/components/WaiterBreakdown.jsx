import { INR } from '../utils/money';
import { waiterRollup } from '../utils/report';

export default function WaiterBreakdown({ bills }) {
  const rows = waiterRollup(bills);
  if (!rows.length) return null;
  return (
    <div className="card">
      <div className="hd"><h2>Waiter-wise</h2></div>
      <div className="bd scrollx">
        <table className="tb">
          <thead><tr><th>Waiter</th><th>Bills</th><th>Guests</th><th style={{ textAlign: 'right' }}>Sale</th><th style={{ textAlign: 'right' }}>Avg bill</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td>{r.bills}</td>
                <td>{r.guests}</td>
                <td style={{ textAlign: 'right' }}><b className="num">{INR(r.revenue)}</b></td>
                <td style={{ textAlign: 'right' }}>{INR(r.bills ? r.revenue / r.bills : 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
