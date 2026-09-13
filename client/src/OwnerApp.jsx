import { useOwnerAuth } from './context/OwnerAuthContext';
import OwnerLoginPage from './pages/OwnerLoginPage';
import OwnerReportsPage from './pages/OwnerReportsPage';

export default function OwnerApp() {
  const { user, ready, logout } = useOwnerAuth();

  if (!ready) return null;
  if (!user) return <OwnerLoginPage />;

  return (
    <>
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
          <div className="brand"><b>Funny Mouse</b><span>Owner reports</span></div>
          <div className="spacer"></div>
          <button className="pill" style={{ cursor: 'pointer' }} onClick={logout}>Logout</button>
        </div>
      </header>
      <main className="wrap" style={{ paddingTop: 16 }}>
        <OwnerReportsPage />
      </main>
    </>
  );
}
