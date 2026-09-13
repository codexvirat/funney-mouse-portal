import { useEffect, useState } from 'react';
import api from '../api/client';
import { tstr } from '../utils/date';
import { priceForMinutes } from '../utils/bill';
import { memberActive } from '../utils/member';

export default function SessionsCard({ cust, setCust, setIsNew, setPhone, config, addItem, toast }) {
  const [sessions, setSessions] = useState([]);
  const [, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await api.get('/sessions');
        if (!cancelled) setSessions(data.sessions);
      } catch (e) { /* ignore transient poll errors */ }
    };
    load();
    const poll = setInterval(load, 15000);
    const clock = setInterval(() => setTick(t => t + 1), 20000);
    return () => { cancelled = true; clearInterval(poll); clearInterval(clock); };
  }, []);

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
          return (
            <div className="sess" key={s._id}>
              <span className="tm">{Math.floor(mins / 60)}h {String(mins % 60).padStart(2, '0')}m</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b>{s.name || 'Walk-in'}</b><br />
                <span className="hint">{s.kids} kid{s.kids > 1 ? 's' : ''} · in {tstr(s.start)}{s.member ? ' · member' : ''}</span>
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
