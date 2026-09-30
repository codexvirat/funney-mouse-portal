import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { key: 'tables', label: 'Tables', admin: false },
  { key: 'bill', label: 'Quick bill', admin: false },
  { key: 'bills', label: 'Sabhi bills', admin: false },
  { key: 'party', label: 'Party booking', admin: false },
  { key: 'cash', label: 'Cash / Kharcha', admin: false },
  { key: 'day', label: 'Day end', admin: true },
  { key: 'mem', label: 'Members', admin: true },
  { key: 'cust', label: 'Customers', admin: true },
  { key: 'log', label: 'Activity log', admin: true },
  { key: 'setup', label: 'Setup', admin: true }
];

export default function Tabs({ view, setView }) {
  const { isAdmin, user } = useAuth();
  const tabs = isAdmin ? TABS : TABS.filter(t => !t.admin);
  // On a narrow window the tabs scroll sideways with a hidden scrollbar; let
  // a normal (vertical) mouse wheel scroll them too.
  const row = useRef(null);
  useEffect(() => {
    const el = row.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const max = el.scrollWidth - el.clientWidth;
      const next = Math.max(0, Math.min(max, el.scrollLeft + e.deltaY));
      if (next === el.scrollLeft) return;
      e.preventDefault();
      el.scrollLeft = next;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  return (
    <nav className="tabs" aria-label="Sections">
      <div className="wrap" ref={row}>
        {tabs.map(t => (
          <button key={t.key} className="tab" aria-current={view === t.key} onClick={() => setView(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
