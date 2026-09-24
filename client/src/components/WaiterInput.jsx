import { useEffect, useState } from 'react';
import api from '../api/client';

let cache = null;

// Captain (waiter) logins a table can be assigned to. Cached for the page's
// lifetime — Setup changes show up after a reload.
export function useCaptains() {
  const [captains, setCaptains] = useState(cache || []);
  useEffect(() => {
    if (cache) return;
    api.get('/auth/captains').then(({ data }) => { cache = data.captains; setCaptains(cache); }).catch(() => {});
  }, []);
  return captains;
}

// Typed waiter name → the captain login it belongs to ('' if none), so that
// captain gets the "food ready" notification.
export function captainFor(name, captains) {
  const n = String(name || '').trim().toLowerCase();
  if (!n) return '';
  const c = captains.find(x => x.name.toLowerCase() === n || x.username === n);
  return c ? c.username : '';
}

// Free-text waiter field that suggests captain logins.
export default function WaiterInput({ value, onChange, onBlur, captains }) {
  const linked = captainFor(value, captains);
  return (
    <>
      <input type="text" list="captain-list" placeholder="Waiter / captain ka naam" value={value}
        onChange={e => onChange(e.target.value)} onBlur={onBlur} />
      <datalist id="captain-list">{captains.map(c => <option key={c.username} value={c.name} />)}</datalist>
      {value && (
        <small className="hint" style={{ display: 'block', marginTop: 4 }}>
          {linked ? '🔔 Food ready hone par is captain ko notification jayega' : captains.length ? 'Captain login se match nahi — notification nahi jayega' : ''}
        </small>
      )}
    </>
  );
}
