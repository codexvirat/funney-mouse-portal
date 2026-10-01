import { useEffect, useState } from 'react';
import api from '../api/client';
import { useConfig } from '../context/ConfigContext';
import { openWhatsApp } from '../utils/notify';
import { prettyDate } from '../utils/date';
import { memberBalance, memberValidity } from '../utils/member';
import { INR } from '../utils/money';
import NewMembershipCard from '../components/NewMembershipCard';

function reminderText(m, shop) {
  const who = m.name ? m.name + ' ji' : 'Namaste';
  const reason = m.state === 'low'
    ? (m.kind === 'visits' ? `aapke ${m.planName} me sirf ${m.visitsLeft || 0} visit bache hain` : `aapke ${m.planName} me sirf ${Math.round((m.hoursLeft || 0) * 10) / 10} hour bache hain`)
    : m.state === 'expired' || m.state === 'used'
      ? `aapka ${m.planName} khatam ho gaya hai`
      : `aapka ${m.planName} ${m.expiresAt ? prettyDate(m.expiresAt) : 'jaldi'} ko khatam ho raha hai`;
  return `${who}, ${shop} se yaad dilana tha — ${reason}. 🧀\n\nRenew karke bachchon ki masti jaari rakhiye! Agli visit par counter par renew kar sakte hain, ya reply karein.`;
}

const MEMTAG = {
  active: ['Active', 'var(--mint)'], expiring: ['Expiring soon', 'var(--berry)'],
  low: ['Kam bacha', 'var(--berry)'], expired: ['Expired', 'var(--muted)'], used: ['Khatam', 'var(--muted)']
};

function MemberRow({ m, shop, onStartMembership, onViewCustomer }) {
  const [label, color] = MEMTAG[m.state] || MEMTAG.active;
  const bal = memberBalance(m);
  return (
    <div className="sess" style={{ background: 'var(--surface-2)', borderColor: 'var(--line-2)' }}>
      <span style={{ flex: '1 1 160px', minWidth: 0 }}>
        <b>{m.name || m.phone}</b>
        <div className="hint">{m.phone} · {m.planName} · {bal} · {memberValidity(m)}</div>
      </span>
      <span className="badge" style={{ background: 'transparent', border: `1px solid ${color}`, color }}>{label}</span>
      {m.state !== 'active' && <button className="btn sm ghost" onClick={() => openWhatsApp(m.phone, reminderText(m, shop))}>WhatsApp reminder</button>}
      <button className="btn sm" onClick={() => onStartMembership(m.phone)}>{m.state === 'expired' || m.state === 'used' ? 'Dobara bechein' : 'Renew'}</button>
      <button className="btn sm ghost" onClick={() => onViewCustomer(m.phone)}>Details</button>
    </div>
  );
}

// Total / done / remaining the way the membership register writes them.
function visitCols(m) {
  if (m.kind !== 'visits') {
    return m.hours > 0
      ? [m.hours + ' hr', Math.round((m.hours - (m.hoursLeft || 0)) * 10) / 10 + ' hr', Math.round((m.hoursLeft || 0) * 10) / 10 + ' hr']
      : ['Unlimited', '', 'Unlimited'];
  }
  return m.visits > 0 ? [m.visits, m.visitsUsed || 0, m.visitsLeft || 0] : ['Unlimited', m.visitsUsed || 0, 'Unlimited'];
}

function exportMembers(list) {
  const q = s => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const head = ['S', 'Parents Name', 'Child Name', 'Contact', 'Card Holder', 'Start Date', 'Plan', 'Expire Date', 'Total Visit', 'Done Visit', 'Remaining Visit', 'Amount', 'Remark', 'Status'];
  const lines = [head.join(',')].concat(list.map((m, i) => [
    i + 1, q(m.name), q(m.kid), q(m.phone + (m.altPhone ? ' / ' + m.altPhone : '')), q(m.cardHolder), m.startedAt || '',
    q(m.planName), m.expiresAt || 'Lifetime', ...visitCols(m), m.amount || '', q(m.remark), (MEMTAG[m.state] || MEMTAG.active)[0]
  ].join(',')));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
  a.download = 'funny-mouse-members.csv';
  a.click();
}

function MemberTable({ list, onStartMembership, onViewCustomer }) {
  return (
    <div className="scrollx">
      <table className="tb" style={{ minWidth: 980 }}>
        <thead><tr>
          <th>S</th><th>Parent</th><th>Child</th><th>Contact</th><th>Card holder</th><th>Start</th><th>Plan</th>
          <th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'right' }}>Done</th><th style={{ textAlign: 'right' }}>Left</th>
          <th style={{ textAlign: 'right' }}>Amount</th><th>Remark</th><th>Status</th><th></th>
        </tr></thead>
        <tbody>
          {list.map((m, i) => {
            const [label, color] = MEMTAG[m.state] || MEMTAG.active;
            const [total, done, left] = visitCols(m);
            return (
              <tr key={m.phone}>
                <td>{i + 1}</td>
                <td><b>{m.name || '—'}</b></td>
                <td>{m.kid}</td>
                <td>{m.phone}{m.altPhone && <div className="hint">{m.altPhone}</div>}</td>
                <td>{m.cardHolder}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{m.startedAt ? prettyDate(m.startedAt) : ''}</td>
                <td>{m.planName}<div className="hint">{memberValidity(m)}</div></td>
                <td style={{ textAlign: 'right' }}>{total}</td>
                <td style={{ textAlign: 'right' }}>{done}</td>
                <td style={{ textAlign: 'right' }}><b>{left}</b></td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{m.amount ? INR(m.amount) : ''}</td>
                <td style={{ maxWidth: 180 }}>{m.remark}</td>
                <td><span className="badge" style={{ background: 'transparent', border: `1px solid ${color}`, color, whiteSpace: 'nowrap' }}>{label}</span></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn sm" onClick={() => onStartMembership(m.phone)}>{m.state === 'expired' || m.state === 'used' ? 'Dobara bechein' : 'Renew'}</button>{' '}
                  <button className="btn sm ghost" onClick={() => onViewCustomer(m.phone)}>Details</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function MembersPage({ onStartMembership, onViewCustomer }) {
  const { config } = useConfig();
  const shop = (config && config.shopName) || 'Funny Mouse';
  // Renew from a member row fills that number into the Nayi membership form.
  const [renew, setRenew] = useState(null);
  const renewHere = (phone) => { setRenew({ phone, at: Date.now() }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get('/members'); setMembers(data.members); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const live = members.filter(m => ['active', 'expiring', 'low'].includes(m.state));
  const hoursLeft = live.reduce((a, m) => a + (m.kind !== 'visits' && m.hours > 0 ? (m.hoursLeft || 0) : 0), 0);
  const visitsLeft = live.reduce((a, m) => a + (m.kind === 'visits' && m.visits > 0 ? (m.visitsLeft || 0) : 0), 0);
  const alertList = members.filter(m => ['expiring', 'low'].includes(m.state));
  // Register order: oldest membership first, like the paper register.
  const register = [...members].sort((a, b) => String(a.startedAt || '').localeCompare(String(b.startedAt || '')));
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? register.filter(m => [m.name, m.kid, m.phone, m.altPhone, m.cardHolder].some(v => String(v || '').toLowerCase().includes(needle)))
    : register;

  return (
    <>
      <NewMembershipCard onDone={load} prefill={renew} />

      {loading ? <p className="hint">Loading…</p> : (
        <>
          <div className="stats" style={{ marginBottom: 14 }}>
            <div className="stat"><small>Active members</small><b>{live.length}</b></div>
            {hoursLeft > 0 && <div className="stat"><small>Unused hours (liability)</small><b>{Math.round(hoursLeft * 10) / 10}</b></div>}
            <div className="stat"><small>Bache visits (passes)</small><b>{visitsLeft}</b></div>
            <div className="stat"><small>Attention chahiye</small><b>{alertList.length}</b></div>
          </div>
          {alertList.length > 0 && (
            <div className="card"><div className="hd"><h2>Renewal due</h2></div><div className="bd">
              {alertList.map(m => <MemberRow key={m.phone} m={m} shop={shop} onStartMembership={renewHere} onViewCustomer={onViewCustomer} />)}
            </div></div>
          )}
          <div className="card"><div className="hd"><h2>Membership register</h2><div className="spacer"></div><span className="hint">{members.length} total</span></div>
            <div className="bd">
              {members.length ? (
                <>
                  <div className="row" style={{ marginBottom: 10 }}>
                    <input type="text" placeholder="Naam, bachcha ya number se dhoondein" value={q} style={{ flex: '1 1 220px' }} onChange={e => setQ(e.target.value)} />
                    <button className="btn sm" style={{ flex: '0 0 auto' }} onClick={() => exportMembers(register)}>Export CSV</button>
                  </div>
                  {shown.length
                    ? <MemberTable list={shown} onStartMembership={renewHere} onViewCustomer={onViewCustomer} />
                    : <p className="hint">Koi member nahi mila.</p>}
                </>
              ) : <div className="empty"><b>Abhi koi member nahi</b>Upar number daal kar pehla plan bech dijiye.</div>}
            </div>
          </div>
        </>
      )}
    </>
  );
}
