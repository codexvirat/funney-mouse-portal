import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await login(username.trim(), password);
    } catch (e) {
      setErr((e.response && e.response.data && e.response.data.message) || 'Login fail ho gaya');
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
        <p className="hint" style={{ textAlign: 'center', margin: '0 0 20px' }}>Daily sales register me login karein</p>
        <label className="f"><span>Username</span>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} autoFocus placeholder="username" />
        </label>
        <label className="f"><span>Password</span>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="password" />
        </label>
        {err && <p className="hint" style={{ color: 'var(--danger)', margin: '0 0 12px' }}>{err}</p>}
        <button className="btn primary" type="submit" disabled={busy} style={{ width: '100%', padding: 14 }}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </div>
  );
}
