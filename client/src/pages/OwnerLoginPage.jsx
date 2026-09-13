import { useState } from 'react';
import { useOwnerAuth } from '../context/OwnerAuthContext';

export default function OwnerLoginPage() {
  const { loginWithPin } = useOwnerAuth();
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await loginWithPin(pin);
    } catch (e) {
      setErr((e.response && e.response.data && e.response.data.message) || 'Galat PIN');
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="loginWrap">
      <form className="card loginCard" onSubmit={submit}>
        <div className="mark" aria-hidden="true" style={{ margin: '0 auto 14px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="6.5" cy="6.5" r="3.6" fill="#2B2100" /><circle cx="17.5" cy="6.5" r="3.6" fill="#2B2100" />
            <circle cx="12" cy="14" r="6.4" fill="#2B2100" />
            <circle cx="9.8" cy="12.6" r="1" fill="#FFC53D" /><circle cx="14.2" cy="12.6" r="1" fill="#FFC53D" />
            <circle cx="12" cy="15.4" r="1.15" fill="#FFC53D" />
          </svg>
        </div>
        <h1 style={{ textAlign: 'center', fontSize: 20, margin: '0 0 4px' }}>Funny Mouse</h1>
        <p className="hint" style={{ textAlign: 'center', margin: '0 0 20px' }}>Owner reports — apna PIN daaliye</p>
        <input
          type="password" inputMode="numeric" maxLength={8} autoFocus placeholder="PIN"
          value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
          style={{ fontSize: 22, textAlign: 'center', letterSpacing: '.3em', padding: 14, marginBottom: 14 }}
        />
        {err && <p className="hint" style={{ color: 'var(--danger)', margin: '0 0 12px', textAlign: 'center' }}>{err}</p>}
        <button className="btn primary" type="submit" disabled={busy || pin.length < 4} style={{ width: '100%', padding: 14 }}>
          {busy ? 'Checking…' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}
