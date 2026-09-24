import { useEffect, useState } from 'react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { useConfig } from '../context/ConfigContext';
import { openWhatsApp } from '../utils/notify';
import { prettyDate } from '../utils/date';

function reminderText(m, shop) {
  const who = m.name ? m.name + ' ji' : 'Namaste';
  const reason = m.state === 'low'
    ? `aapke ${m.planName} me sirf ${Math.round((m.hoursLeft || 0) * 10) / 10} hour bache hain`
    : m.state === 'expired' || m.state === 'used'
      ? `aapka ${m.planName} khatam ho gaya hai`
      : `aapka ${m.planName} ${m.expiresAt ? prettyDate(m.expiresAt) : 'jaldi'} ko khatam ho raha hai`;
  return `${who}, ${shop} se yaad dilana tha — ${reason}. 🧀\n\nRenew karke bachchon ki masti jaari rakhiye! Agli visit par counter par renew kar sakte hain, ya reply karein.`;
}

const MEMTAG = {
  active: ['Active', 'var(--mint)'], expiring: ['Expiring soon', 'var(--berry)'],
  low: ['Low hours', 'var(--berry)'], expired: ['Expired', 'var(--muted)'], used: ['Hours over', 'var(--muted)']
};

function MemberRow({ m, shop, onStartMembership, onViewCustomer }) {
  const [label, color] = MEMTAG[m.state] || MEMTAG.active;
  const bal = m.hours > 0 ? (Math.round((m.hoursLeft || 0) * 10) / 10) + ' / ' + m.hours + ' hr' : 'Unlimited';
  return (
    <div className="sess" style={{ background: 'var(--surface-2)', borderColor: 'var(--line-2)' }}>
      <span style={{ flex: '1 1 160px', minWidth: 0 }}>
        <b>{m.name || m.phone}</b>
        <div className="hint">{m.phone} · {m.planName} · {bal} · till {m.expiresAt || '—'}</div>
      </span>
      <span className="badge" style={{ background: 'transparent', border: `1px solid ${color}`, color }}>{label}</span>
      {m.state !== 'active' && <button className="btn sm ghost" onClick={() => openWhatsApp(m.phone, reminderText(m, shop))}>WhatsApp reminder</button>}
      <button className="btn sm" onClick={() => onStartMembership(m.phone)}>{m.state === 'expired' || m.state === 'used' ? 'Dobara bechein' : 'Renew'}</button>
      <button className="btn sm ghost" onClick={() => onViewCustomer(m.phone)}>Details</button>
    </div>
  );
}

export default function MembersPage({ onStartMembership, onViewCustomer }) {
  const toast = useToast();
  const { config } = useConfig();
  const shop = (config && config.shopName) || 'Funny Mouse';
  const [phone, setPhone] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get('/members'); setMembers(data.members); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const live = members.filter(m => ['active', 'expiring', 'low'].includes(m.state));
  const hoursLeft = live.reduce((a, m) => a + (m.hours > 0 ? (m.hoursLeft || 0) : 0), 0);
  const alertList = members.filter(m => ['expiring', 'low'].includes(m.state));

  return (
    <>
      <div className="card"><div className="hd"><h2>Membership</h2></div><div className="bd">
        <div className="row">
          <label className="f" style={{ margin: 0, flex: '2 1 190px' }}><span>Naya member banaye — mobile number</span>
            <input type="tel" inputMode="numeric" maxLength={10} placeholder="10 digit number"
              value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} />
          </label>
          <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn dark" onClick={() => { if (phone.length !== 10) { toast('10 digit number daaliye'); return; } onStartMembership(phone); }}>Plan chunein</button>
          </div>
        </div>
        <p className="hint" style={{ margin: '8px 0 0' }}>Plan bill ke through bikega, taaki payment mode aur day-end total me sahi count ho.</p>
      </div></div>

      {loading ? <p className="hint">Loading…</p> : (
        <>
          <div className="stats" style={{ marginBottom: 14 }}>
            <div className="stat"><small>Active members</small><b>{live.length}</b></div>
            <div className="stat"><small>Unused hours (liability)</small><b>{Math.round(hoursLeft * 10) / 10}</b></div>
            <div className="stat"><small>Attention chahiye</small><b>{alertList.length}</b></div>
          </div>
          {alertList.length > 0 && (
            <div className="card"><div className="hd"><h2>Renewal due</h2></div><div className="bd">
              {alertList.map(m => <MemberRow key={m.phone} m={m} shop={shop} onStartMembership={onStartMembership} onViewCustomer={onViewCustomer} />)}
            </div></div>
          )}
          <div className="card"><div className="hd"><h2>Sab members</h2><div className="spacer"></div><span className="hint">{members.length} total</span></div>
            <div className="bd">
              {members.length
                ? members.map(m => <MemberRow key={m.phone} m={m} shop={shop} onStartMembership={onStartMembership} onViewCustomer={onViewCustomer} />)
                : <div className="empty"><b>Abhi koi member nahi</b>Upar number daal kar pehla plan bech dijiye.</div>}
            </div>
          </div>
        </>
      )}
    </>
  );
}
