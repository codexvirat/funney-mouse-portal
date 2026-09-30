import { useEffect, useState } from 'react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { INR } from '../utils/money';
import { prettyDate, tstr } from '../utils/date';
import Sheet from './Sheet';
import EditBillSheet from './EditBillSheet';

const REASONS = {
  void: ['Galti se bill ban gaya', 'Double bill', 'Customer ne cancel kiya', 'Galat table / customer'],
  edit: ['Galat item', 'Galat quantity', 'Galat payment mode', 'Discount lagana tha']
};

const errMsg = (e, fallback) => (e.response && e.response.data && e.response.data.message) || fallback;

// Asks for a reason + an admin password. `onConfirm({ reason, password })`
// should throw on failure; its message is shown inline.
function ApprovalSheet({ open, bill, action, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setReason(''); setPassword(''); setErr(''); } }, [open]);

  if (!bill) return <Sheet open={false} onClose={onClose}><div /></Sheet>;
  const isVoid = action === 'void';

  const submit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) { setErr('Reason likhiye'); return; }
    if (!password) { setErr('Admin password daaliye'); return; }
    setBusy(true); setErr('');
    try { await onConfirm({ reason: reason.trim(), password }); }
    catch (ex) { setErr(errMsg(ex, 'Kuch galat hua')); }
    finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <form onSubmit={submit}>
        <h2 style={{ margin: '0 0 4px', fontSize: 17 }}>{isVoid ? 'Bill delete karein' : 'Bill edit karein'} — #{bill.no}</h2>
        <p className="hint" style={{ margin: '0 0 14px' }}>
          {prettyDate(bill.date)} · {tstr(bill.ts)} · {bill.name || 'Walk-in'} · <b>{INR(bill.total)}</b>
          {isVoid && <><br />Bill sale total se hat jayega aur "Deleted" list me reason ke saath rahega.</>}
        </p>
        <div className="chips" style={{ marginBottom: 10 }}>
          {REASONS[action].map(r => <button key={r} type="button" className="chip" aria-pressed={reason === r} onClick={() => setReason(r)}>{r}</button>)}
        </div>
        <label className="f"><span>Reason</span>
          <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Kya galti hui?" /></label>
        <label className="f"><span>Admin password</span>
          <input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
        {err && <p style={{ color: 'var(--danger)', margin: '0 0 10px' }}>{err}</p>}
        <button type="submit" className={'btn ' + (isVoid ? 'danger' : 'primary')} style={{ width: '100%', padding: 14 }} disabled={busy}>
          {busy ? 'Checking…' : isVoid ? 'Haan, bill delete karein' : 'Aage badhein — bill edit karein'}
        </button>
      </form>
    </Sheet>
  );
}

// Whole delete / edit flow for one saved bill:
//   void: reason + password -> bill voided
//   edit: reason + password (checked first) -> edit screen -> saved with them
// `target` is null or { bill, action: 'void' | 'edit' }.
export default function BillFixSheets({ target, onClose, onDone }) {
  const toast = useToast();
  const [approval, setApproval] = useState(null);

  useEffect(() => { setApproval(null); }, [target]);

  const bill = target && target.bill;
  const action = target && target.action;

  const confirm = async ({ reason, password }) => {
    if (action === 'void') {
      const { data } = await api.patch(`/bills/${bill._id}/void`, { reason, password });
      toast('Bill #' + bill.no + ' delete ho gaya');
      if (data.warning) window.alert(data.warning);
      onDone(data.bill);
    } else {
      await api.post('/bills/verify-approval', { reason, password });
      setApproval({ reason, password });
    }
  };

  return (
    <>
      <ApprovalSheet open={!!target && !approval} bill={bill} action={action || 'void'} onClose={onClose} onConfirm={confirm} />
      <EditBillSheet open={!!approval} bill={bill} approval={approval} onClose={onClose} onSaved={onDone} />
    </>
  );
}
