import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { INR } from '../utils/money';
import { dstr, prettyDate, tstr } from '../utils/date';

const MODES = ['CASH', 'UPI', 'CARD'];

function Line({ label, value, strong, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, color }}>
      <span className={strong ? '' : 'hint'}>{label}</span>
      {strong ? <b className="num" style={{ fontSize: 17 }}>{value}</b> : <b className="num">{value}</b>}
    </div>
  );
}

// Cash drawer + daily expenses. Staff count opening cash in the morning,
// note every expense, and count the drawer at close; the page shows what
// should be there and any shortage/excess.
export default function CashPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [date, setDate] = useState(dstr());
  const [data, setData] = useState(null);
  const [opening, setOpening] = useState('');
  const [closing, setClosing] = useState('');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('CASH');
  const [busy, setBusy] = useState(false);

  const apply = (d) => {
    setData(d);
    setOpening(d.day.opening == null ? '' : String(d.day.opening));
    setClosing(d.day.closing == null ? '' : String(d.day.closing));
  };

  useEffect(() => {
    setData(null);
    api.get('/cash/' + date).then(({ data: d }) => apply(d)).catch(() => toast('Cash data load nahi hua'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const run = async (fn, okMsg) => {
    setBusy(true);
    try { apply((await fn()).data); if (okMsg) toast(okMsg); }
    catch (e) { toast((e.response && e.response.data && e.response.data.message) || 'Save nahi hua'); }
    finally { setBusy(false); }
  };

  const saveOpening = () => run(() => api.put('/cash/' + date, { opening: opening === '' ? null : Number(opening) }), 'Opening cash save ho gaya');
  const saveClosing = () => run(() => api.put('/cash/' + date, { closing: closing === '' ? null : Number(closing) }), 'Closing cash save ho gaya');
  const addExpense = async () => {
    if (!desc.trim() || !(Number(amount) > 0)) { toast('Kharche ka naam aur amount daaliye'); return; }
    await run(() => api.post(`/cash/${date}/expenses`, { desc: desc.trim(), amount: Number(amount), mode }), 'Kharcha add ho gaya');
    setDesc(''); setAmount(''); setMode('CASH');
  };
  const delExpense = (e) => {
    if (!window.confirm(`"${e.desc}" ${INR(e.amount)} delete kar dein?`)) return;
    run(() => api.delete('/cash/expenses/' + e._id), 'Delete ho gaya');
  };

  const s = data && data.summary;

  return (
    <>
      <div className="card"><div className="bd">
        <div className="row">
          <input type="date" style={{ flex: '2 1 160px' }} value={date} max={dstr()} onChange={e => setDate(e.target.value)} />
          <button className="btn" style={{ flex: '0 0 auto' }} onClick={() => setDate(dstr())}>Today</button>
        </div>
      </div></div>

      {!data ? <p className="hint">Loading…</p> : (
        <>
          <div className="card"><div className="hd"><h2>Cash drawer — {prettyDate(date)}</h2></div><div className="bd">
            <div className="row" style={{ alignItems: 'flex-end' }}>
              <label className="f" style={{ margin: 0, flex: '1 1 150px' }}><span>Subah ka opening cash</span>
                <input type="number" min="0" value={opening} placeholder="0" onChange={e => setOpening(e.target.value)} /></label>
              <button className="btn" style={{ flex: '0 0 auto' }} disabled={busy} onClick={saveOpening}>Save</button>
            </div>

            <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
              <Line label="Opening cash" value={INR(s.opening)} />
              <Line label="+ Cash bills" value={INR(s.cashSales)} />
              {s.bookingAdvance > 0 && <Line label="+ Aaj ki booking advance (cash)" value={INR(s.bookingAdvance)} />}
              {s.advanceInBills > 0 && <Line label="− Pehle li hui advance (bill me cash dikh rahi)" value={INR(s.advanceInBills)} />}
              <Line label="− Cash kharcha" value={INR(s.cashExpenses)} />
              <Line label="Drawer me hona chahiye" value={INR(s.expected)} strong />
            </div>

            <div className="row" style={{ alignItems: 'flex-end', marginTop: 14 }}>
              <label className="f" style={{ margin: 0, flex: '1 1 150px' }}><span>Raat ko gin ke kitna mila</span>
                <input type="number" min="0" value={closing} placeholder="Gin ke daaliye" onChange={e => setClosing(e.target.value)} /></label>
              <button className="btn dark" style={{ flex: '0 0 auto' }} disabled={busy} onClick={saveClosing}>Close karein</button>
            </div>
            {s.difference != null && (
              <p style={{ margin: '12px 0 0', fontWeight: 700, color: s.difference === 0 ? 'var(--mint)' : 'var(--berry)' }}>
                {s.difference === 0 ? 'Cash barabar hai ✓' : s.difference < 0 ? `${INR(-s.difference)} kam hai (shortage)` : `${INR(s.difference)} zyada hai`}
              </p>
            )}
          </div></div>

          <div className="card"><div className="hd"><h2>Aaj ka kharcha</h2><div className="spacer"></div><span className="hint">Total {INR(s.totalExpenses)}</span></div><div className="bd">
            <div className="row" style={{ alignItems: 'flex-end', marginBottom: 12 }}>
              <label className="f" style={{ margin: 0, flex: '2 1 170px' }}><span>Kis cheez ka</span>
                <input type="text" value={desc} placeholder="e.g. Doodh, gas, safai" onChange={e => setDesc(e.target.value)} /></label>
              <label className="f" style={{ margin: 0, flex: '1 1 100px' }}><span>Amount</span>
                <input type="number" min="0" value={amount} placeholder="0" onChange={e => setAmount(e.target.value)} /></label>
              <div style={{ flex: '1 1 170px' }}>
                <div className="seg">
                  {MODES.map(m => <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>{m}</button>)}
                </div>
              </div>
              <button className="btn dark" style={{ flex: '0 0 auto' }} disabled={busy} onClick={addExpense}>+ Add</button>
            </div>
            {data.expenses.length ? (
              <table className="tb"><tbody>
                {data.expenses.map(e => (
                  <tr key={e._id}>
                    <td>{e.desc}<br /><span className="hint">{tstr(e.createdAt)} · {e.by} · {e.mode}</span></td>
                    <td style={{ textAlign: 'right' }}><b className="num">{INR(e.amount)}</b></td>
                    {isAdmin && <td style={{ width: 1 }}><button className="btn sm ghost" onClick={() => delExpense(e)}>✕</button></td>}
                  </tr>
                ))}
              </tbody></table>
            ) : <p className="hint" style={{ margin: 0 }}>Aaj koi kharcha nahi likha.</p>}
          </div></div>
        </>
      )}
    </>
  );
}
