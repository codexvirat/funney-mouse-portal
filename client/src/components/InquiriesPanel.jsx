import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import { useConfig } from '../context/ConfigContext';
import { useToast } from '../context/ToastContext';
import { INR } from '../utils/money';
import { prettyDate, dstr } from '../utils/date';
import { openWhatsApp } from '../utils/notify';
import Sheet from './Sheet';

const FILTERS = [
  { key: 'open', label: 'Open' },
  { key: 'converted', label: 'Booked' },
  { key: 'lost', label: 'Lost' },
  { key: 'all', label: 'Sab' }
];
const STATUS = {
  new: ['Nayi', 'var(--sky)'],
  followup: ['Follow-up', 'var(--accent-ink)'],
  converted: ['Booked', 'var(--mint)'],
  lost: ['Lost', 'var(--muted)']
};
const PACKAGES = ['Premium', 'Signature', 'Elite', 'Majestic'];
const SOURCES = ['Call', 'Walk-in', 'Instagram', 'Party guest', 'Google', 'Reference'];

function blank() {
  return { inquiryDate: dstr(), name: '', phone: '', childName: '', partyDate: '', kids: 0, adults: 0, packageInterest: '', budget: 0, source: '', note: '', followUpDate: '', status: 'new' };
}

function InquirySheet({ open, inquiry, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setF(inquiry ? { ...blank(), ...inquiry } : blank()); }, [open, inquiry]);
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));

  const save = async () => {
    if (!f.name.trim() && f.phone.length !== 10) { toast('Naam ya 10 digit number daaliye'); return; }
    setBusy(true);
    try {
      const body = { ...f, status: f.status === 'new' && f.followUpDate ? 'followup' : f.status };
      const { data } = inquiry ? await api.patch('/inquiries/' + inquiry._id, body) : await api.post('/inquiries', body);
      toast(inquiry ? 'Inquiry update ho gayi' : 'Inquiry save ho gayi');
      onSaved(data.inquiry);
    } catch (e) {
      toast((e.response && e.response.data && e.response.data.message) || 'Save nahi hua');
    } finally {
      setBusy(false);
    }
  };

  const txt = (label, k, props = {}) => (
    <label className="f" style={{ flex: '1 1 150px' }}><span>{label}</span>
      <input type="text" value={f[k] || ''} onChange={e => set(k, e.target.value)} {...props} /></label>
  );
  const num = (label, k) => (
    <label className="f" style={{ flex: '1 1 90px' }}><span>{label}</span>
      <input type="number" min="0" value={f[k] || ''} placeholder="0" onChange={e => set(k, Number(e.target.value) || 0)} /></label>
  );
  const date = (label, k) => (
    <label className="f" style={{ flex: '1 1 150px' }}><span>{label}</span>
      <input type="date" value={f[k] || ''} onChange={e => set(k, e.target.value)} /></label>
  );

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 style={{ margin: '0 0 12px', fontSize: 17 }}>{inquiry ? 'Inquiry edit karein' : 'Nayi inquiry'}</h2>
      <div className="row">{date('Inquiry date', 'inquiryDate')}{date('Party date (expected)', 'partyDate')}</div>
      <div className="row">
        {txt('Naam (parent)', 'name')}
        <label className="f" style={{ flex: '1 1 150px' }}><span>Mobile</span>
          <input type="tel" inputMode="numeric" maxLength={10} value={f.phone || ''} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} /></label>
        {txt('Bachche ka naam', 'childName')}
      </div>
      <div className="row">{num('Kids (approx)', 'kids')}{num('Adults (approx)', 'adults')}{num('Budget ₹', 'budget')}</div>
      <span className="hint" style={{ display: 'block', marginBottom: 5 }}>Package interest</span>
      <div className="chips" style={{ marginBottom: 11 }}>
        {PACKAGES.map(x => <button key={x} type="button" className="chip" aria-pressed={f.packageInterest === x} onClick={() => set('packageInterest', f.packageInterest === x ? '' : x)}>{x}</button>)}
      </div>
      <span className="hint" style={{ display: 'block', marginBottom: 5 }}>Kahan se aaye</span>
      <div className="chips" style={{ marginBottom: 11 }}>
        {SOURCES.map(x => <button key={x} type="button" className="chip" aria-pressed={f.source === x} onClick={() => set('source', f.source === x ? '' : x)}>{x}</button>)}
      </div>
      <label className="f"><span>Note</span>
        <textarea rows={2} value={f.note || ''} onChange={e => set('note', e.target.value)} placeholder="e.g. Carnival theme chahiye, rates bheje WhatsApp par" /></label>
      <div className="row">{date('Follow-up kab karna hai', 'followUpDate')}</div>
      {inquiry && (
        <>
          <span className="hint" style={{ display: 'block', marginBottom: 5 }}>Status</span>
          <div className="seg" style={{ marginBottom: 12 }}>
            {Object.entries(STATUS).map(([k, [l]]) => <button key={k} type="button" aria-pressed={f.status === k} onClick={() => set('status', k)}>{l}</button>)}
          </div>
        </>
      )}
      <button className="btn primary" style={{ width: '100%', padding: 14 }} disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Inquiry save karein'}</button>
    </Sheet>
  );
}

// Party enquiries, newest date first, grouped by day. "Booking banayein"
// hands the enquiry to the Party booking form (prefilled).
export default function InquiriesPanel({ onConvert, reloadKey }) {
  const toast = useToast();
  const { config } = useConfig();
  const shopName = (config && config.shopName) || 'Funny Mouse';
  const [filter, setFilter] = useState('open');
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null); // null | { inquiry }

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/inquiries', { params: { status: filter } });
      setList(data.inquiries);
    } catch (e) { toast('Inquiries load nahi hui'); }
  }, [filter, toast]);
  useEffect(() => { load(); }, [load, reloadKey]);

  const patch = async (iq, body, msg) => {
    try { await api.patch('/inquiries/' + iq._id, body); toast(msg); load(); }
    catch (e) { toast('Update nahi hua'); }
  };
  const remove = async (iq) => {
    if (!window.confirm('Ye inquiry delete kar dein?')) return;
    try { await api.delete('/inquiries/' + iq._id); toast('Inquiry delete ho gayi'); load(); } catch (e) { toast('Delete nahi hua'); }
  };

  const today = dstr();
  const needle = q.trim().toLowerCase();
  const shown = list.filter(iq => !needle || [iq.name, iq.phone, iq.childName, iq.note].some(v => String(v || '').toLowerCase().includes(needle)));
  const groups = [];
  shown.forEach(iq => {
    const g = groups[groups.length - 1];
    if (g && g.date === iq.inquiryDate) g.items.push(iq); else groups.push({ date: iq.inquiryDate, items: [iq] });
  });
  const dueCount = list.filter(iq => ['new', 'followup'].includes(iq.status) && iq.followUpDate && iq.followUpDate <= today).length;

  const waText = iq => `Namaste${iq.name ? ' ' + iq.name + ' ji' : ''}! ${shopName} se — aapne${iq.childName ? ' ' + iq.childName + ' ki' : ''} party ke liye poocha tha${iq.partyDate ? ' (' + prettyDate(iq.partyDate) + ')' : ''}. 🎉\n\nKoi sawaal ho ya booking confirm karni ho to reply karein. 🧀`;

  return (
    <>
      <div className="card">
        <div className="hd" style={{ flexWrap: 'wrap' }}>
          <h2>Party inquiries</h2>
          {dueCount > 0 && <span className="badge warn">{dueCount} follow-up aaj / pending</span>}
          <div className="spacer"></div>
          <button className="btn primary" onClick={() => setEditing({ inquiry: null })}>+ Nayi inquiry</button>
        </div>
        <div className="bd">
          <div className="seg" style={{ marginBottom: 12 }}>
            {FILTERS.map(x => <button key={x.key} aria-pressed={filter === x.key} onClick={() => setFilter(x.key)}>{x.label}</button>)}
          </div>
          <input type="search" placeholder="Naam, mobile ya note se dhoondhein…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
      </div>

      {!shown.length && <div className="card"><div className="empty"><b>Koi inquiry nahi</b>"+ Nayi inquiry" se jodiye.</div></div>}

      {groups.map(g => (
        <div className="card" key={g.date}>
          <div className="hd"><h2>{g.date === today ? 'Aaj · ' : ''}{prettyDate(g.date)}</h2><div className="spacer"></div><span className="hint">{g.items.length}</span></div>
          <div className="bd">
            {g.items.map(iq => {
              const [label, color] = STATUS[iq.status] || STATUS.new;
              const due = ['new', 'followup'].includes(iq.status) && iq.followUpDate && iq.followUpDate <= today;
              return (
                <div className="sess" key={iq._id} style={{ background: 'var(--surface-2)', borderColor: due ? 'var(--berry)' : 'var(--line-2)' }}>
                  <span style={{ flex: '1 1 220px', minWidth: 0 }}>
                    <b>{iq.name || iq.phone}</b>{iq.childName ? <span className="hint"> · bachcha: {iq.childName}</span> : null}
                    {' '}<span className="badge" style={{ background: 'transparent', border: `1px solid ${color}`, color }}>{label}</span>
                    {due && <span className="badge warn" style={{ marginLeft: 4 }}>Follow-up {iq.followUpDate === today ? 'aaj' : 'pending'}</span>}
                    <div className="hint">
                      {[iq.phone, iq.partyDate && 'party ' + prettyDate(iq.partyDate), (iq.kids || iq.adults) && `${iq.kids} kids · ${iq.adults} adults`,
                        iq.packageInterest, iq.budget && 'budget ' + INR(iq.budget), iq.source, iq.followUpDate && !due && 'follow-up ' + prettyDate(iq.followUpDate)]
                        .filter(Boolean).join(' · ')}
                    </div>
                    {iq.note && <div className="hint">{iq.note}</div>}
                  </span>
                  {['new', 'followup'].includes(iq.status) && <button className="btn sm primary" onClick={() => onConvert(iq)}>Booking banayein</button>}
                  {iq.phone && <button className="btn sm ghost" onClick={() => openWhatsApp(iq.phone, waText(iq))}>WhatsApp</button>}
                  <button className="btn sm ghost" onClick={() => setEditing({ inquiry: iq })}>Edit</button>
                  {['new', 'followup'].includes(iq.status) && <button className="btn sm ghost" onClick={() => patch(iq, { status: 'lost' }, 'Lost mark ho gayi')}>Lost</button>}
                  <button className="btn sm ghost danger" onClick={() => remove(iq)}>✕</button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <InquirySheet open={!!editing} inquiry={editing && editing.inquiry} onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load(); }} />
    </>
  );
}
