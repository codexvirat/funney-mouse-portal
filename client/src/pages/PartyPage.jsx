import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { useConfig } from '../context/ConfigContext';
import { INR } from '../utils/money';
import { prettyDate, dstr } from '../utils/date';
import MonthCalendar from '../components/MonthCalendar';
import PartyBookingSheet, { calcParty, partyFormHTML, nth } from '../components/PartyBookingSheet';
import PaymentSheet from '../components/PaymentSheet';
import ReceiptSheet from '../components/ReceiptSheet';
import PartyExtrasSheet from '../components/PartyExtrasSheet';

const FILTERS = [
  { key: 'pending', label: 'Upcoming' },
  { key: 'used', label: 'Ho gayi' },
  { key: 'cancelled', label: 'Cancelled' }
];

function birthdayOf(p) {
  if (!p.dob || !p.partyDate) return 0;
  const age = Number(p.partyDate.slice(0, 4)) - Number(p.dob.slice(0, 4));
  return age > 0 && age < 30 ? age : 0;
}

// All party bookings made with the Party Booking Form, in one place.
export default function PartyPage() {
  const toast = useToast();
  const { config } = useConfig();
  const shopName = (config && config.shopName) || 'Funny Mouse';
  const [status, setStatus] = useState('pending');
  const [bookings, setBookings] = useState([]);
  const [view, setView] = useState('list');
  const [month, setMonth] = useState(dstr().slice(0, 7));
  const [day, setDay] = useState(null);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null); // null | { booking } (booking null = new form)
  const [billing, setBilling] = useState(null); // booking being billed
  const [receipt, setReceipt] = useState(null); // { bill, customer }
  const [extrasFor, setExtrasFor] = useState(null); // booking getting an extra order

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/bookings', { params: { status } });
      setBookings(data.bookings.filter(b => b.party));
    } catch (e) { toast('Bookings load nahi hui'); }
  }, [status, toast]);

  useEffect(() => { load(); }, [load]);

  const printForm = (b) => {
    const area = document.getElementById('printarea');
    if (!area) return;
    area.innerHTML = partyFormHTML(b.party, shopName);
    area.className = 'a4';
    window.print();
    area.className = '';
  };

  // Party is billed from here — no table is opened — as one bill. Play
  // lines carry no GST, food + add-ons carry theirs; the advance is
  // pre-filled in its payment mode.
  const billCalc = billing ? calcParty(billing.party) : null;
  const advMode = billing ? (billing.party.advanceMode || 'CASH') : 'CASH';
  const makeBill = async (pay) => {
    const items = billCalc.fin.lines.filter(l => l.amount > 0).map(l => ({ part: l.part, name: `${l.label} (${l.detail})`, rate: l.amount }));
    const { data } = await api.post(`/bookings/${billing._id}/final-bill`, { items, pay });
    toast('Party ka bill #' + data.bill.no + ' ban gaya');
    setBilling(null);
    setReceipt({ bill: data.bill, customer: data.customer });
    load();
  };

  const cancel = async (b) => {
    if (!window.confirm(`${b.name} ki party booking cancel kar dein?`)) return;
    try {
      await api.patch('/bookings/' + b._id, { status: 'cancelled' });
      toast('Booking cancel ho gayi');
      load();
    } catch (e) { toast('Cancel nahi hua'); }
  };

  const needle = q.trim().toLowerCase();
  const shown = bookings.filter(b => {
    if (view === 'cal' && day && b.eventDate !== day) return false;
    if (!needle) return true;
    const p = b.party;
    return [b.name, b.phone, p.motherName, p.fatherName, p.motherPhone, p.fatherPhone, p.school]
      .some(v => String(v || '').toLowerCase().includes(needle));
  });
  if (status !== 'pending') shown.reverse();

  const today = dstr();
  const totals = shown.reduce((a, b) => {
    const c = calcParty(b.party);
    return { total: a.total + c.total, advance: a.advance + c.advance, balance: a.balance + c.balance };
  }, { total: 0, advance: 0, balance: 0 });
  const byDate = {};
  bookings.forEach(b => { byDate[b.eventDate] = (byDate[b.eventDate] || 0) + 1; });

  return (
    <>
      <div className="card">
        <div className="hd" style={{ flexWrap: 'wrap' }}>
          <h2>Party bookings</h2><div className="spacer"></div>
          <button className="btn primary" onClick={() => setEditing({ booking: null })}>+ Nayi party booking</button>
        </div>
        <div className="bd">
          <div className="row" style={{ marginBottom: 12 }}>
            <div className="seg" style={{ flex: '1 1 260px' }}>
              {FILTERS.map(f => <button key={f.key} aria-pressed={status === f.key} onClick={() => { setStatus(f.key); setDay(null); }}>{f.label}</button>)}
            </div>
            <div className="seg" style={{ flex: '0 1 200px' }}>
              <button aria-pressed={view === 'list'} onClick={() => { setView('list'); setDay(null); }}>List</button>
              <button aria-pressed={view === 'cal'} onClick={() => setView('cal')}>Calendar</button>
            </div>
          </div>
          <input type="search" placeholder="Naam, mobile ya school se dhoondhein…" value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 12 }} />
          {view === 'cal' && (
            <div style={{ marginBottom: 12 }}>
              <MonthCalendar month={month} onMonth={setMonth} selected={day} onSelect={setDay} renderMark={d => byDate[d] ? <i>{byDate[d]}</i> : null} />
            </div>
          )}
          {shown.length > 0 && (
            <div className="stats">
              <div className="stat"><small>Parties</small><b>{shown.length}</b></div>
              <div className="stat"><small>Total estimate</small><b>{INR(totals.total)}</b></div>
              <div className="stat"><small>Advance mila</small><b>{INR(totals.advance)}</b></div>
              <div className="stat"><small>Balance baaki</small><b>{INR(totals.balance)}</b></div>
            </div>
          )}
        </div>
      </div>

      {!shown.length && (
        <div className="card"><div className="empty">
          <b>{view === 'cal' && day ? prettyDate(day) + ' ko koi party nahi' : 'Koi party booking nahi'}</b>
          "+ Nayi party booking" se form bharein — estimate apne aap banega.
        </div></div>
      )}

      {shown.map(b => {
        const p = b.party;
        const c = calcParty(p);
        const bd = birthdayOf(p);
        const lowAdv = c.total > 0 && c.advance < c.minAdvance;
        const payDue = status === 'pending' && p.nextPaymentDate && p.nextPaymentDate <= today && c.balance > 0;
        return (
          <div className="card" key={b._id}>
            <div className="hd" style={{ flexWrap: 'wrap' }}>
              <h2>{p.childName || b.name}{bd ? ` · ${nth(bd)} Birthday` : ''}</h2>
              {b.eventDate === today && status === 'pending' && <span className="badge">Aaj</span>}
              {lowAdv && status === 'pending' && <span className="badge warn">25% advance nahi</span>}
              {payDue && <span className="badge warn">Payment due</span>}
              <div className="spacer"></div>
              <b className="num">{INR(c.total)}</b>
            </div>
            <div className="bd">
              <p style={{ margin: '0 0 6px' }}>
                <b>{prettyDate(b.eventDate)}</b> · {p.timing === 'Other' ? (p.timingOther || 'Other') : p.timing} · {p.packageType}
              </p>
              <p className="hint" style={{ margin: '0 0 6px' }}>
                {[
                  p.foodPackage && `${p.foodPackage} (${p.foodPref})`,
                  `Kids ${c.fin.kids} · Adults ${c.fin.adults}`,
                  (p.theme === 'Other' ? p.themeOther : p.theme) && `${p.theme === 'Other' ? p.themeOther : p.theme} theme`,
                  p.branch
                ].filter(Boolean).join(' · ')}
              </p>
              <p className="hint" style={{ margin: '0 0 10px' }}>
                {[
                  p.motherName && `${p.motherName}${p.motherPhone ? ' ' + p.motherPhone : ''}`,
                  p.fatherName && `${p.fatherName}${p.fatherPhone ? ' ' + p.fatherPhone : ''}`,
                  !p.motherName && !p.fatherName && b.phone
                ].filter(Boolean).join(' · ')}
              </p>
              <p style={{ margin: '0 0 12px' }}>
                Advance <b>{INR(c.advance)}</b> ({p.advanceMode}) · Balance <b>{INR(c.balance)}</b>
                {p.nextPaymentDate ? <span className="hint"> · next payment {prettyDate(p.nextPaymentDate)}</span> : null}
              </p>
              {c.fin.lines.some(l => l.extra) && (
                <p className="hint" style={{ margin: '-6px 0 12px' }}>
                  Extra order: <b>{INR(c.fin.lines.filter(l => l.extra).reduce((x, l) => x + l.amount, 0))}</b> (food bill me judega) — {(p.extras || []).map(x => x.name + ' ×' + x.qty).join(', ')}
                </p>
              )}
              <div className="row" style={{ gap: 8 }}>
                {status === 'pending' && <button className="btn sm primary" style={{ flex: '0 0 auto' }} disabled={!c.total} onClick={() => setBilling(b)}>Final bill banayein</button>}
                {Object.entries(b.bills || {}).map(([k, x]) => (
                  <span key={k} className="badge" style={{ alignSelf: 'center' }}>Bill #{x.no}{x.date ? ' · ' + prettyDate(x.date) : ''}</span>
                ))}
                {status === 'pending' && <button className="btn sm" style={{ flex: '0 0 auto' }} onClick={() => setExtrasFor(b)}>
                  + Extra order{(p.extras || []).length ? ` (${p.extras.reduce((a, x) => a + x.qty, 0)})` : ''}</button>}
                <button className="btn sm dark" style={{ flex: '0 0 auto' }} onClick={() => setEditing({ booking: b })}>Form / estimate</button>
                <button className="btn sm" style={{ flex: '0 0 auto' }} onClick={() => printForm(b)}>Print</button>
                {status === 'pending' && <button className="btn sm ghost danger" style={{ flex: '0 0 auto' }} onClick={() => cancel(b)}>Cancel</button>}
              </div>
            </div>
          </div>
        );
      })}

      <PaymentSheet open={!!billing} total={billCalc ? billCalc.total : 0} onClose={() => setBilling(null)} onSave={makeBill}
        initialPay={billing && billCalc.advance > 0 ? { [advMode]: Math.min(billCalc.advance, billCalc.total) } : undefined}
        initialNote={billing ? `${billing.party.childName || billing.name} ki party · Play ${INR(billCalc.fin.playBill)} (no GST) + Food ${INR(billCalc.fin.foodBill)} = ${INR(billCalc.total)}` +
          (billCalc.advance ? ` · advance ${INR(billCalc.advance)} (${advMode}) pehle mil chuka · baaki ${INR(billCalc.balance)}` : '') : undefined} />
      <ReceiptSheet open={!!receipt} bill={receipt && receipt.bill} customer={receipt && receipt.customer} config={config} onClose={() => setReceipt(null)} doneLabel="Done" />
      {extrasFor && <PartyExtrasSheet booking={extrasFor} onClose={() => setExtrasFor(null)} onSaved={() => { setExtrasFor(null); load(); }} />}
      <PartyBookingSheet open={!!editing} booking={editing && editing.booking} onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); if (status !== 'pending') setStatus('pending'); else load(); }} />
    </>
  );
}
