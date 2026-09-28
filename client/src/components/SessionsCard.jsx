import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { tstr } from '../utils/date';
import { priceForMinutes, playElapsedMins } from '../utils/bill';
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
  const alerts = sessions.map(s => ({ s, a: playAlert(s.start, s.plannedMins, s.pausedMs, s.pausedAt) }));
  useEffect(() => {
    alerts.forEach(({ s, a }) => {
      if (!a || a.state === 'ok') return;
      const k = s._id + ':' + a.state;
      if (!alerted.current.has(k)) { alerted.current.add(k); beep(); toast((s.name || 'Walk-in') + ' — ' + a.text); }
    });
  });

  if (!sessions.length) return null;

  // Kid stepped out — pause so that gap isn't charged; resume when back.
  const togglePause = async (s) => {
    try {
      const { data } = await api.post(`/sessions/${s._id}/${s.pausedAt ? 'resume' : 'pause'}`);
      setSessions(prev => prev.map(x => x._id === s._id ? data.session : x));
      toast(s.pausedAt ? 'Timer phir se chalu' : 'Timer pause ho gaya');
    } catch (e) {
      toast('Timer update nahi hua');
    }
  };

  const endAndBill = async (s, bill) => {
    try {
      const { data: ended } = await api.delete(`/sessions/${s._id}`);
      setSessions(prev => prev.filter(x => x._id !== s._id));
      if (!bill) return;
      const done = ended.session || s;
      const mins = Math.max(5, playElapsedMins(done.start, done.pausedMs, done.pausedAt));
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
          const mins = playElapsedMins(s.start, s.pausedMs, s.pausedAt);
          const a = playAlert(s.start, s.plannedMins, s.pausedMs, s.pausedAt);
          const style = s.pausedAt ? { borderColor: 'var(--line-2)', background: 'var(--surface-2)' }
            : a && a.state !== 'ok' ? { borderColor: 'var(--berry)', background: 'var(--berry-soft)' } : undefined;
          return (
            <div className="sess" key={s._id} style={style}>
              <span className="tm">{s.pausedAt ? '⏸ ' : ''}{Math.floor(mins / 60)}h {String(mins % 60).padStart(2, '0')}m</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b>{s.name || 'Walk-in'}</b><br />
                <span className="hint">{s.kids} kid{s.kids > 1 ? 's' : ''} · in {tstr(s.start)}{s.member ? ' · member' : ''}{s.pausedAt ? ' · paused ' + tstr(s.pausedAt) : ''}</span>
                {a && <><br /><b style={{ color: a.state === 'ok' ? 'var(--muted)' : 'var(--berry)', fontSize: 13 }}>{a.text}</b></>}
              </span>
              <button className="btn sm" onClick={() => togglePause(s)}>{s.pausedAt ? '▶ Resume' : '⏸ Pause'}</button>
              <button className="btn sm dark" onClick={() => endAndBill(s, true)}>End & bill</button>
              <button className="btn sm ghost" onClick={() => { if (window.confirm('Session cancel kar dein?')) endAndBill(s, false); }}>Cancel</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
