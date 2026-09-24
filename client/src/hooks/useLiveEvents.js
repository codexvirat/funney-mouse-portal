import { useEffect, useRef } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// One shared connection to the server's change feed (/api/events) for the
// whole page, however many screens are listening.
let source = null;
let sourceToken = null;
const listeners = new Set();

function connect(token) {
  if (source && sourceToken === token) return;
  if (source) source.close();
  sourceToken = token;
  source = new EventSource(`${BASE}/events?token=${encodeURIComponent(token)}`);
  source.onmessage = (e) => {
    let type;
    try { type = JSON.parse(e.data).type; } catch (err) { return; }
    listeners.forEach(l => l(type));
  };
}

function disconnectIfIdle() {
  if (!listeners.size && source) { source.close(); source = null; sourceToken = null; }
}

// Calls onEvent(type) when the server reports a change of one of `types`
// ('tables', 'config', 'sessions'). Screens still poll as a fallback — this
// just makes updates show up instantly.
export function useLiveEvents(types, onEvent) {
  const handler = useRef(onEvent);
  handler.current = onEvent;
  const key = types.join(',');
  const token = localStorage.getItem('fm_token');

  useEffect(() => {
    if (!token || typeof EventSource === 'undefined') return undefined;
    const want = new Set(key.split(','));
    const listener = (type) => { if (want.has(type)) handler.current(type); };
    listeners.add(listener);
    connect(token);
    return () => { listeners.delete(listener); disconnectIfIdle(); };
  }, [key, token]);
}
