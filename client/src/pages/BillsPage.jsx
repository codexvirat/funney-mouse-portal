import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import { useConfig } from '../context/ConfigContext';
import { useToast } from '../context/ToastContext';
import { INR } from '../utils/money';
import { dstr, prettyDate, tstr, addDays, weekRange } from '../utils/date';
import { rollup } from '../utils/report';
import { exportCSV } from '../utils/csv';
import ReceiptSheet from '../components/ReceiptSheet';
import BillFixSheets from '../components/BillFixSheets';

const RANGES = [
  { key: 'today', label: 'Aaj' },
  { key: 'yday', label: 'Kal' },
  { key: 'week', label: 'Is hafte' },
  { key: 'month', label: 'Is mahine' },
  { key: 'all', label: 'All bills' },
  { key: 'custom', label: 'Custom' }
];
const MODES = ['UPI', 'CASH', 'CARD', 'DUE'];

function rangeOf(key, custom) {
  const today = dstr();
  if (key === 'today') return { from: today, to: today };
  if (key === 'yday') { const y = addDays(today, -1); return { from: y, to: y }; }
  if (key === 'week') return weekRange(today);
  if (key === 'month') return { from: today.slice(0, 8) + '01', to: today.slice(0, 8) + '31' };
  if (key === 'all') return { from: '2000-01-01', to: '2999-12-31' };
  return custom;
}

// Every saved bill in one list. Mistakes are fixed here: Delete (void) or
// Edit, both behind a reason + admin password. Deleted bills drop out of the
// main list and totals but stay visible under "Deleted" with their reason.
export default function BillsPage() {
  const { config } = useConfig();
  const toast = useToast();
  const [rangeKey, setRangeKey] = useState('today');
  const [custom, setCustom] = useState({ from: addDays(dstr(), -6), to: dstr() });
  const [show, setShow] = useState('ok');
  const [mode, setMode] = useState('');
  const [q, setQ] = useState('');
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fix, setFix] = useState(null);
  const [receipt, setReceipt] = useState(null);

  const { from, to } = rangeOf(rangeKey, custom);

  const load = useCallback(async () => {
    if (!from || !to || from > to) return;
    setLoading(true);
    try {
      const { data } = await api.get('/bills', { params: { from, to } });
      setBills(data.bills.slice().reverse());
    } catch (e) {
      toast('Bills load nahi hue');
    } finally {
      setLoading(false);
    }
  }, [from, to, toast]);

  useEffect(() => { load(); }, [load]);

  const okBills = bills.filter(b => !b.void);
  const deleted = bills.filter(b => b.void);
  const needle = q.trim().toLowerCase();
  const shown = (show === 'ok' ? okBills : deleted).filter(b => {
    if (mode && !(b.pay && b.pay[mode] > 0)) return false;
    if (!needle) return true;
    return String(b.no) === needle.replace('#', '') ||
      [b.name, b.phone, b.tableName].some(v => String(v || '').toLowerCase().includes(needle));
  });
  const t = rollup(show === 'ok' ? shown : []);
  const multiDay = from !== to;

  return (
    <>
      <div className="card"><div className="bd">
        <div className="chips" style={{ marginBottom: 10 }}>
          {RANGES.map(r => <button key={r.key} className="chip" aria-pressed={rangeKey === r.key} onClick={() => setRangeKey(r.key)}>{r.label}</button>)}
        </div>
        {rangeKey === 'custom' && (
          <div className="row" style={{ marginBottom: 10 }}>
            <label className="f" style={{ margin: 0 }}><span>From</span><input type="date" value={custom.from} onChange={e => setCustom(c => ({ ...c, from: e.target.value }))} /></label>
            <label className="f" style={{ margin: 0 }}><span>To</span><input type="date" value={custom.to} onChange={e => setCustom(c => ({ ...c, to: e.target.value }))} /></label>
          </div>
        )}
        <input type="search" placeholder="Bill no., naam, mobile ya table se dhoondhein…" value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 10 }} />
        <div className="row">
          <div className="seg" style={{ flex: '1 1 240px' }}>
            <button aria-pressed={show === 'ok'} onClick={() => setShow('ok')}>Sahi bills ({okBills.length})</button>
            <button aria-pressed={show === 'deleted'} onClick={() => setShow('deleted')}>Deleted ({deleted.length})</button>
          </div>
          <div className="seg" style={{ flex: '1 1 260px' }}>
            <button aria-pressed={!mode} onClick={() => setMode('')}>All</button>
            {MODES.map(m => <button key={m} aria-pressed={mode === m} onClick={() => setMode(mode === m ? '' : m)}>{m}</button>)}
          </div>
        </div>
      </div></div>

      {show === 'ok' && (
        <div className="stats" style={{ marginBottom: 14 }}>
          <div className="stat"><small>{rangeKey === 'all' ? 'All bills' : from === to ? prettyDate(from) : prettyDate(from) + ' – ' + prettyDate(to)}</small><b>{INR(t.total)}</b></div>
          <div className="stat"><small>Bills</small><b>{t.bills}</b></div>
          {MODES.filter(m => t[m] > 0).map(m => <div className="stat" key={m}><small>{m}</small><b>{INR(t[m])}</b></div>)}
        </div>
      )}

      <div className="card">
        <div className="hd"><h2>{show === 'ok' ? 'Bills' : 'Deleted bills'}</h2><div className="spacer"></div>
          {shown.length > 0 && <button className="btn sm" onClick={() => exportCSV(shown, rangeKey === 'all' ? 'all-bills' : from === to ? from : from + '_to_' + to)}>Export CSV</button>}
        </div>
        <div className="bd scrollx">
          {loading ? <p className="hint" style={{ margin: 0 }}>Loading…</p> : shown.length ? (
            <table className="tb">
              <thead><tr><th>#</th><th>{multiDay ? 'Date / time' : 'Time'}</th><th>Customer</th><th>Items</th><th style={{ textAlign: 'right' }}>Total</th><th>Mode</th><th></th></tr></thead>
              <tbody>
                {shown.map(b => (
                  <tr key={b._id}>
                    <td><b>{b.no}</b></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{multiDay && <>{prettyDate(b.date).replace(/, \d{4}/, '')}<br /></>}{tstr(b.ts)}</td>
                    <td>{b.name || 'Walk-in'}
                      {b.phone ? <><br /><span className="hint">{b.phone}</span></> : null}
                      {b.tableName ? <><br /><span className="hint">{b.tableName}</span></> : null}
                      {b.editedAt && <><br /><span className="badge">Edited{b.editCount > 1 ? ' ×' + b.editCount : ''}</span>{b.editReason && <span className="hint"> {b.editReason}{b.editedBy ? ' · ' + b.editedBy : ''}</span>}</>}
                      {b.void && <><br /><span className="badge warn">Deleted</span> <span className="hint">{b.voidReason || '—'}{b.voidBy ? ' · ' + b.voidBy : ''}{b.voidAt ? ' · ' + tstr(b.voidAt) : ''}</span></>}
                    </td>
                    <td>{b.items.map((i, ix) => (<span key={ix}>{i.name}{i.qty > 1 ? ' ×' + i.qty : ''}<br /></span>))}</td>
                    <td style={{ textAlign: 'right' }}><b className="num">{INR(b.total)}</b></td>
                    <td>{Object.entries(b.pay).filter(([, v]) => v > 0).map(([k, v]) => (<span key={k}>{k} {INR(v)}<br /></span>))}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {!b.void && (
                        <>
                          <button className="btn sm ghost" onClick={() => setReceipt(b)}>Receipt</button>{' '}
                          <button className="btn sm" onClick={() => setFix({ bill: b, action: 'edit' })}>Edit</button>{' '}
                          <button className="btn sm ghost danger" onClick={() => setFix({ bill: b, action: 'void' })}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">
              <b>{show === 'ok' ? 'Koi bill nahi mila' : 'Koi deleted bill nahi'}</b>
              {rangeKey !== 'custom' ? 'Upar date range badal kar dekhiye.' : from > to ? '"From" date "To" se pehle honi chahiye.' : 'Date range badal kar dekhiye.'}
            </div>
          )}
        </div>
      </div>

      <BillFixSheets target={fix} onClose={() => setFix(null)} onDone={() => { setFix(null); load(); }} />
      <ReceiptSheet open={!!receipt} bill={receipt} config={config} onClose={() => setReceipt(null)} doneLabel="Close" />
    </>
  );
}
