import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { tstr } from '../utils/date';
import { priceForMinutes } from '../utils/bill';
import { memberActive } from '../utils/member';
import { beep, playAlert } from '../utils/notify';
import { useLiveEvents } from '../hooks/useLiveEvents';

export default function SessionsCard({ cust, setCust, setIsNew, setPhone, config, addItem, toast }) {
  const [sessions, setSessions] = useState([]);
  const [, setTick] = useState(0);
  const alerted = useRef(new Set());

  const load = async () => {
    try {
      const { data } = await api.get('/sessions');
      setSessions(data.sessions);
    } catch (e) { /* ignore transient poll errors */ }
  };
  useLiveEvents(['sessions'], load);

  useEffect(() => {
    load();
    const poll = setInterval(load, 20000);
    const clock = setInterval(() => setTick(t => t + 1), 20000);
    return () => { clearInterval(poll); clearInterval(clock); };
  }, []);

  // Beep once per session when it enters its last 5 minutes and once when time is up.
  const alerts = sessions.map(s => ({ s, a: playAlert(s.start, s.plannedMins) }));
  useEffect(() => {
    alerts.forEach(({ s, a }) => {
      if (!a || a.state === 'ok') return;
      const k = s._id + ':' + a.state;
      if (!alerted.current.has(k)) { alerted.current.add(k); beep(); toast((s.name || 'Walk-in') + ' — ' + a.text); }
    });
  });

  if (!sessions.length) return null;

  const endAndBill = async (s, bill) => {
    try {
      await api.delete(`/sessions/${s._id}`);
      setSessions(prev => prev.filter(x => x._id !== s._id));
      if (!bill) return;
      const mins = Math.max(5, Math.round((Date.now() - new Date(s.start).getTime()) / 60000));
      let activeCust = cust;
      if (s.phone && (!cust || cust.phone !== s.phone)) {
        const { data } = await api.get('/customers/' + s.phone);
        if (data.customer) {
          activeCust = data.customer;
          setCust(data.customer); setIsNew(false); setPhone(s.phone);
        }
      }
      const member = s.member && memberActive(activeCust);
      const rate = member ? 0 : priceForMinutes(config, mins);
      addItem({
        cat: 'play', name: member ? 'Play (membership)' : 'Play area',
        qty: s.kids, rate, amount: rate * s.kids,
        meta: { minutes: mins, kids: s.kids, member }
      });
      toast(mins + ' min play added');
    } catch (e) {
      toast('Kuch gadbad ho gayi');
    }
  };

  return (
    <div className="card">
      <div className="hd"><h2>Play chal raha hai</h2><div className="spacer"></div><span className="hint">{sessions.length} running</span></div>
      <div className="bd">
        {sessions.map(s => {
          const mins = Math.max(0, Math.round((Date.now() - new Date(s.start).getTime()) / 60000));
          const a = playAlert(s.start, s.plannedMins);
          return (
            <div className="sess" key={s._id} style={a && a.state !== 'ok' ? { borderColor: 'var(--berry)', background: 'var(--berry-soft)' } : undefined}>
              <span className="tm">{Math.floor(mins / 60)}h {String(mins % 60).padStart(2, '0')}m</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b>{s.name || 'Walk-in'}</b><br />
                <span className="hint">{s.kids} kid{s.kids > 1 ? 's' : ''} · in {tstr(s.start)}{s.member ? ' · member' : ''}</span>
                {a && <><br /><b style={{ color: a.state === 'ok' ? 'var(--muted)' : 'var(--berry)', fontSize: 13 }}>{a.text}</b></>}
              </span>
              <button className="btn sm dark" onClick={() => endAndBill(s, true)}>End & bill</button>
              <button className="btn sm ghost" onClick={() => { if (window.confirm('Session cancel kar dein?')) endAndBill(s, false); }}>Cancel</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
