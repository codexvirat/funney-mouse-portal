import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { prettyDate, dstr } from '../utils/date';

export default function TopBar() {
  const { user, logout, isAdmin } = useAuth();
  const { config } = useConfig();

  return (
    <header className="topbar">
      <div className="wrap">
        <div className="mark" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="6.5" cy="6.5" r="3.6" fill="#2B2100" /><circle cx="17.5" cy="6.5" r="3.6" fill="#2B2100" />
            <circle cx="12" cy="14" r="6.4" fill="#2B2100" />
            <circle cx="9.8" cy="12.6" r="1" fill="#FFC53D" /><circle cx="14.2" cy="12.6" r="1" fill="#FFC53D" />
            <circle cx="12" cy="15.4" r="1.15" fill="#FFC53D" />
          </svg>
        </div>
        <div className="brand"><b>{(config && config.shopName) || 'Funny Mouse'}</b><span>{prettyDate(dstr())}</span></div>
        <div className="spacer"></div>
        <span className="pill">{user.name || user.username} · {isAdmin ? 'Admin' : (user.role === 'kitchen' ? 'Kitchen' : 'Staff')}</span>
        <button className="pill" style={{ cursor: 'pointer' }} onClick={logout}>Logout</button>
      </div>
    </header>
  );
}
