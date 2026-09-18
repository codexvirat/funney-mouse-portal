import { useAuth } from '../context/AuthContext';

const TABS = [
  { key: 'tables', label: 'Tables', admin: false },
  { key: 'bill', label: 'Quick bill', admin: false },
  { key: 'day', label: 'Day end', admin: true },
  { key: 'mem', label: 'Members', admin: true },
  { key: 'cust', label: 'Customers', admin: true },
  { key: 'setup', label: 'Setup', admin: true }
];

export default function Tabs({ view, setView }) {
  const { isAdmin } = useAuth();
  const tabs = isAdmin ? TABS : TABS.filter(t => !t.admin);
  return (
    <nav className="tabs" aria-label="Sections">
      <div className="wrap">
        {tabs.map(t => (
          <button key={t.key} className="tab" aria-current={view === t.key} onClick={() => setView(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
