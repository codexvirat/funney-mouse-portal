import { useEffect, useState } from 'react';
import api from '../api/client';
import { useConfig } from '../context/ConfigContext';
import { useToast } from '../context/ToastContext';
import { memberActive, memberLabel } from '../utils/member';
import Sheet from './Sheet';

// Member: look the member up by number (that's the verification), show
// their pass, pick a free table and how many kids play, open it. The server
// charges the visits and puts a ₹0 "Membership visit" line on the table, so
// the bill is only for food.
function MemberStart({ onBack, onOpened }) {
  const { config } = useConfig();
  const toast = useToast();
  const [phone, setPhone] = useState('');
  const [cust, setCust] = useState(null);
  const [looked, setLooked] = useState(false);
  const [kids, setKids] = useState(1);
  const [adults, setAdults] = useState(1);
  const [free, setFree] = useState(null);
  const [tableId, setTableId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get('/table-orders').then(({ data }) => {
      if (cancelled) return;
      const busyIds = new Set(data.orders.map(o => o.tableId));
      const list = ((config && config.tables) || []).filter(t => !busyIds.has(t.id));
      setFree(list);
      setTableId(list.length ? list[0].id : '');
    }).catch(() => { if (!cancelled) setFree([]); });
    return () => { cancelled = true; };
  }, [config]);

  useEffect(() => {
    if (phone.length !== 10) { setCust(null); setLooked(false); return undefined; }
    let cancelled = false;
    api.get('/customers/' + phone)
      .then(({ data }) => { if (!cancelled) { setCust(data.customer); setLooked(true); } })
      .catch(() => { if (!cancelled) { setCust(null); setLooked(true); } });
    return () => { cancelled = true; };
  }, [phone]);

  const m = cust && cust.membership;
  const active = memberActive(cust);
  const visitPass = !!(m && m.kind === 'visits');
  const maxKids = visitPass && m.visits > 0 ? (m.visitsLeft || 0) : 20;
  const table = (free || []).find(t => t.id === tableId);

  const open = async () => {
    if (!table) { toast('Ek free table chunein'); return; }
    setBusy(true);
    try {
      const { data } = await api.post('/table-orders', {
        tableId: table.id, tableName: table.name, phone, name: cust.name || 'Walk-in',
        adults, kids, member: true, memberKids: kids
      });
      const left = data.customer && data.customer.membership;
      toast(visitPass
        ? `${table.name} khula · ${kids} visit kati${left && left.visits > 0 ? ` · ${left.visitsLeft} bache` : ''}`
        : table.name + ' khula (member)');
      onOpened(data.order);
    } catch (e) {
      toast((e.response && e.response.data && e.response.data.message) || 'Table open nahi hua');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h2 style={{ margin: '0 0 12px', fontSize: 17 }}>Member</h2>
      <label className="f"><span>Member ka mobile number</span>
        <input type="tel" inputMode="numeric" maxLength={10} placeholder="10 digit number" autoFocus
          value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} /></label>

      {looked && !active && (
        <p style={{ color: 'var(--berry)', margin: '0 0 12px' }}>
          {!cust ? 'Is number par koi customer nahi mila.' : !m ? 'Is number par koi membership nahi hai.' : memberLabel(cust) + ' — membership active nahi.'}
          {' '}Non-member ki tarah table kholein ya pehle plan bechein.
        </p>
      )}

      {active && (
        <>
          <div className="custfound" style={{ marginBottom: 12, background: 'var(--grape-soft)', borderColor: 'var(--grape)' }}>
            <div className="av" style={{ background: 'var(--grape)' }}>M</div>
            <div><b>{cust.name || cust.phone}</b>{cust.kid ? <span className="hint"> · bachcha: {cust.kid}</span> : null}
              <div className="hint">{memberLabel(cust)}</div></div>
          </div>

          <span className="hint" style={{ display: 'block', marginBottom: 6 }}>Table</span>
          {free === null ? <p className="hint">Tables load ho rahe hain…</p> : free.length === 0
            ? <p style={{ color: 'var(--berry)', margin: '0 0 12px' }}>Koi table free nahi hai — pehle koi table khali karein.</p>
            : (
              <div className="chips" style={{ marginBottom: 12 }}>
                {free.map(t => <button key={t.id} className="chip" aria-pressed={tableId === t.id} onClick={() => setTableId(t.id)}>{t.name}{t.capacity ? ' · ' + t.capacity : ''}</button>)}
              </div>
            )}

          <div className="row" style={{ marginBottom: 12 }}>
            <div style={{ flex: '0 0 auto' }}>
              <span className="hint" style={{ display: 'block', marginBottom: 5 }}>Kids (khelenge)</span>
              <div className="stepper"><button onClick={() => setKids(v => Math.max(1, v - 1))}>−</button><b>{kids}</b><button onClick={() => setKids(v => Math.min(maxKids, v + 1))}>+</button></div>
            </div>
            <div style={{ flex: '0 0 auto' }}>
              <span className="hint" style={{ display: 'block', marginBottom: 5 }}>Adults</span>
              <div className="stepper"><button onClick={() => setAdults(v => Math.max(0, v - 1))}>−</button><b>{adults}</b><button onClick={() => setAdults(v => v + 1)}>+</button></div>
            </div>
          </div>
          {!visitPass && <p className="hint" style={{ margin: '0 0 12px' }}>Ye hours wala plan hai — table khulne ke baad Play me "Membership se kaato" use karein.</p>}
          <button className="btn primary" style={{ width: '100%', padding: 14 }} disabled={busy || !table || kids > maxKids} onClick={open}>
            {busy ? 'Opening…' : `${table ? table.name : 'Table'} kholen${visitPass ? ` — ${kids} visit katega` : ''}`}
          </button>
          {visitPass && <p className="hint" style={{ margin: '8px 0 0', textAlign: 'center' }}>Play ka paisa nahi lagega — bill sirf food ka banega.</p>}
        </>
      )}
      <button className="btn ghost" style={{ width: '100%', marginTop: 10 }} onClick={onBack}>← Wapas</button>
    </>
  );
}

// Shown when the site opens (and from "+ Naya guest" on Tables): who's here?
export default function GuestStartSheet({ open, onClose, onMemberOpened, onNonMember, onParty }) {
  const [step, setStep] = useState('choose');
  useEffect(() => { if (open) setStep('choose'); }, [open]);
  const tile = { width: '100%', textAlign: 'left', padding: 16, marginBottom: 10 };
  return (
    <Sheet open={open} onClose={onClose}>
      {open && step === 'choose' && (
        <>
          <h2 style={{ margin: '0 0 12px', fontSize: 17 }}>Kaun aaya hai?</h2>
          <button className="pt upi on" style={tile} onClick={() => setStep('member')}>
            <b>Member</b><span>Number se verify · ek visit kategi · bill sirf food ka</span>
          </button>
          <button className="pt cash on" style={tile} onClick={onNonMember}>
            <b>Non-member</b><span>Normal table — play aur food dono ka bill</span>
          </button>
          <button className="pt due on" style={tile} onClick={onParty}>
            <b>Party booking</b><span>Party booking page par jaayein</span>
          </button>
          <button className="btn ghost" style={{ width: '100%' }} onClick={onClose}>Baad me</button>
        </>
      )}
      {open && step === 'member' && <MemberStart onBack={() => setStep('choose')} onOpened={onMemberOpened} />}
    </Sheet>
  );
}
