import { useAuth } from '../context/AuthContext';

const TABS = [
  { key: 'bill', label: 'New bill', admin: false },
  { key: 'day', label: 'Day end', admin: true },
  { key: 'mem', label: 'Members', admin: true },
  { key: 'cust', label: 'Customers', admin: true },
  { key: 'setup', label: 'Setup', admin: true }
];

export default function Tabs({ view, setView }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return null;
  return (
    <nav className="tabs" aria-label="Sections">
      <div className="wrap">
        {TABS.map(t => (
          <button key={t.key} className="tab" aria-current={view === t.key} onClick={() => setView(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
