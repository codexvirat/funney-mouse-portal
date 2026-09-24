import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { INR } from '../utils/money';
import { prettyDate, dstr } from '../utils/date';
import { esc } from '../utils/html';
import { openWhatsApp } from '../utils/notify';
import { useConfig } from '../context/ConfigContext';
import Sheet from './Sheet';
import MonthCalendar from './MonthCalendar';

const PAY_MODES = ['CASH', 'UPI', 'CARD'];

function balanceOf(b) {
  return b.estimate > 0 ? Math.max(0, b.estimate - (b.advance || 0)) : 0;
}

function bookingReceiptHTML(b, shopName) {
  const bal = balanceOf(b);
  return `<h3>${esc(shopName)}</h3>
    <div style="text-align:center;font-size:12px;font-weight:bold">ADVANCE BOOKING RECEIPT</div>
    <div style="text-align:center;font-size:11px">${new Date(b.createdAt || Date.now()).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</div><hr>
    <table>
      <tr><td>Naam</td><td class="rt">${esc(b.name)}</td></tr>
      ${b.phone ? `<tr><td>Mobile</td><td class="rt">${esc(b.phone)}</td></tr>` : ''}
      <tr><td>Event date</td><td class="rt">${prettyDate(b.eventDate)}</td></tr>
      ${b.guests ? `<tr><td>Guests</td><td class="rt">${b.guests}</td></tr>` : ''}
      ${b.tablesCount ? `<tr><td>Tables</td><td class="rt">${b.tablesCount}</td></tr>` : ''}
    </table><hr>
    <table>
      ${b.estimate ? `<tr><td>Estimated bill</td><td class="rt">${INR(b.estimate)}</td></tr>` : ''}
      <tr><td><b>Advance paid</b></td><td class="rt"><b>${INR(b.advance || 0)}</b></td></tr>
      <tr><td colspan="2" style="font-size:11px">${esc(b.advanceMode || '')}</td></tr>
      ${bal ? `<tr><td>Balance (approx)</td><td class="rt">${INR(bal)}</td></tr>` : ''}
    </table>
    ${b.note ? `<hr><div style="font-size:11px">${esc(b.note)}</div>` : ''}<hr>
    <div style="text-align:center;font-size:11px">Advance final bill me adjust hoga. Thank you! 🧀</div>`;
}

function receiptText(b, shopName) {
  const bal = balanceOf(b);
  return [
    `*${shopName}* — Advance booking receipt`, '',
    `Naam: ${b.name}`, `Event: ${prettyDate(b.eventDate)}`,
    b.guests ? `Guests: ${b.guests}` : null,
    `Advance mila: ${INR(b.advance || 0)} (${b.advanceMode})`,
    b.estimate ? `Estimated bill: ${INR(b.estimate)}` : null,
    bal ? `Balance (approx): ${INR(bal)}` : null,
    '', 'Advance final bill me adjust hoga. Thank you! 🧀'
  ].filter(l => l !== null).join('\n');
}

function reminderText(b, shopName) {
  const bal = balanceOf(b);
  return `Namaste ${b.name}! ${shopName} se yaad dilana tha — aapki party ${prettyDate(b.eventDate)} ko hai${b.guests ? ` (${b.guests} guests)` : ''}. 🎉\n\n` +
    `Advance mil chuka hai: ${INR(b.advance || 0)}.` + (bal ? ` Baaki approx ${INR(bal)} event ke din.` : '') +
    `\n\nKoi badlav ho to reply karein. Milte hain! 🧀`;
}

// Month grid of pending bookings; tapping a day filters the list to it.
function BookingCalendar({ bookings, selected, onSelect }) {
  const [month, setMonth] = useState(dstr().slice(0, 7));
  const byDate = {};
  bookings.forEach(b => { byDate[b.eventDate] = (byDate[b.eventDate] || 0) + 1; });
  return <MonthCalendar month={month} onMonth={setMonth} selected={selected} onSelect={onSelect} renderMark={d => byDate[d] ? <i>{byDate[d]}</i> : null} />;
}

function NewBookingSheet({ open, tables, onClose, onCreated }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [eventDate, setEventDate] = useState(dstr());
  const [guests, setGuests] = useState(0);
  const [tablesCount, setTablesCount] = useState(1);
  const [advance, setAdvance] = useState(0);
  const [advanceMode, setAdvanceMode] = useState('CASH');
  const [estimate, setEstimate] = useState(0);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(''); setPhone(''); setEventDate(dstr()); setGuests(0); setTablesCount(1);
      setAdvance(0); setAdvanceMode('CASH'); setEstimate(0); setNote('');
    }
  }, [open]);

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/bookings', {
        name: name || 'Walk-in', phone, eventDate, guests, tablesCount, advance, advanceMode, estimate, note
      });
      onCreated(data.booking);
      toast('Booking add ho gayi');
    } catch (e) {
      toast((e.response && e.response.data && e.response.data.message) || 'Booking save nahi hui');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 style={{ margin: '0 0 12px', fontSize: 17 }}>Naya advance booking</h2>
      <div className="row">
        <label className="f" style={{ flex: '1 1 140px' }}><span>Party ka naam</span>
          <input type="text" value={name} onChange={e => setName(e.target.value)} /></label>
        <label className="f" style={{ flex: '1 1 140px' }}><span>Mobile (optional)</span>
          <input type="tel" inputMode="numeric" maxLength={10} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} /></label>
      </div>
      <div className="row">
        <label className="f" style={{ flex: '1 1 140px' }}><span>Event ki date</span>
          <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} /></label>
        <label className="f" style={{ flex: '1 1 100px' }}><span>Guests (approx)</span>
          <input type="number" min="0" value={guests || ''} onChange={e => { const g = Number(e.target.value) || 0; setGuests(g); setTablesCount(suggestTables(g, tables)); }} /></label>
        <div style={{ flex: '0 0 auto' }}>
          <span className="hint" style={{ display: 'block', marginBottom: 5 }}>Tables chahiye</span>
          <div className="stepper"><button onClick={() => setTablesCount(v => Math.max(1, v - 1))}>−</button><b>{tablesCount}</b><button onClick={() => setTablesCount(v => v + 1)}>+</button></div>
        </div>
      </div>
      <div className="row">
        <label className="f" style={{ flex: '1 1 130px' }}><span>Advance / token</span>
          <input type="number" min="0" value={advance || ''} placeholder="0" onChange={e => setAdvance(Number(e.target.value) || 0)} />
        </label>
        {advance > 0 && (
          <div style={{ flex: '1 1 160px' }}>
            <span className="hint" style={{ display: 'block', marginBottom: 5 }}>Mode</span>
            <div className="seg">
              {PAY_MODES.map(m => <button key={m} aria-pressed={advanceMode === m} onClick={() => setAdvanceMode(m)}>{m}</button>)}
            </div>
          </div>
        )}
      </div>
      <div className="row">
        <label className="f" style={{ flex: '1 1 130px' }}><span>Estimated total bill (optional)</span>
          <input type="number" min="0" value={estimate || ''} placeholder="0" onChange={e => setEstimate(Number(e.target.value) || 0)} />
        </label>
        {estimate > 0 && <p className="hint" style={{ flex: '1 1 160px', alignSelf: 'center', margin: 0 }}>Balance approx {INR(Math.max(0, estimate - advance))}</p>}
      </div>
      <label className="f"><span>Note (optional)</span>
        <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Birthday party, 15 kids" />
      </label>
      <button className="btn primary" style={{ width: '100%', padding: 14, marginTop: 6 }} disabled={busy} onClick={save}>
        {busy ? 'Saving…' : 'Booking save karein'}
      </button>
    </Sheet>
  );
}

function AssignTablesSheet({ booking, freeTables, onClose, onAssigned }) {
  const toast = useToast();
  const [count, setCount] = useState(1);
  const [reserveOnly, setReserveOnly] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (booking) {
      setCount(booking.tablesCount || 1);
      setReserveOnly(booking.eventDate > dstr());
    }
  }, [booking]);

  if (!booking) return <Sheet open={false} onClose={onClose}><div /></Sheet>;

  const picked = freeTables.slice(0, count);
  const short = count > freeTables.length;

  const assign = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/bookings/${booking._id}/assign-tables`, { count, reserveOnly });
      toast(data.orders.length + ' tables ' + booking.name + ' ke liye assign ho gaye');
      onAssigned(data.orders);
    } catch (e) {
      toast((e.response && e.response.data && e.response.data.message) || 'Tables assign nahi hue');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open onClose={onClose}>
      <h2 style={{ margin: '0 0 6px', fontSize: 17 }}>{booking.name} — tables assign karein</h2>
      <p className="hint" style={{ margin: '0 0 14px' }}>
        {prettyDate(booking.eventDate)}{booking.guests ? ' · ' + booking.guests + ' guests' : ''}
        {booking.advance ? ' · advance ' + INR(booking.advance) + ' pehli table pe' : ''}
      </p>
      <div className="row" style={{ alignItems: 'center', marginBottom: 14 }}>
        <div style={{ flex: '0 0 auto' }}>
          <span className="hint" style={{ display: 'block', marginBottom: 5 }}>Kitne tables</span>
          <div className="stepper"><button onClick={() => setCount(v => Math.max(1, v - 1))}>−</button><b>{count}</b><button onClick={() => setCount(v => v + 1)}>+</button></div>
        </div>
        <span className="hint" style={{ flex: 1 }}>{freeTables.length} table free hai abhi</span>
      </div>
      {short
        ? <p className="hint" style={{ color: 'var(--berry)', margin: '0 0 12px' }}>Itne free tables nahi hain — count kam karein ya koi table khali karein.</p>
        : (
          <div className="menu" style={{ marginBottom: 14 }}>
            {picked.map(t => <div key={t.id} className="mi on"><strong>{t.name}</strong><em>seats {t.capacity}</em></div>)}
          </div>
        )}
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <input type="checkbox" checked={reserveOnly} onChange={e => setReserveOnly(e.target.checked)} style={{ width: 18, height: 18 }} />
        <span>Sirf reserve karein (party abhi nahi aayi)</span>
      </label>
      <button className="btn primary" style={{ width: '100%', padding: 14 }} disabled={busy || short} onClick={assign}>
        {busy ? 'Assigning…' : count + ' tables assign karein'}
      </button>
    </Sheet>
  );
}

export default function BookingsCard({ tables, freeTables, onUseBooking, onAssigned }) {
  const toast = useToast();
  const [bookings, setBookings] = useState([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [assigning, setAssigning] = useState(null);
  const [view, setView] = useState('list');
  const [dayFilter, setDayFilter] = useState(null);
  const [receiptFor, setReceiptFor] = useState(null);
  const { config } = useConfig();
  const shopName = (config && config.shopName) || 'Funny Mouse';

  const printReceipt = (b) => {
    const area = document.getElementById('printarea');
    if (area) area.innerHTML = bookingReceiptHTML(b, shopName);
    window.print();
  };

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/bookings', { params: { status: 'pending' } });
      setBookings(data.bookings);
    } catch (e) { /* ignore transient poll errors */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cancel = async (b) => {
    if (!window.confirm('Ye booking cancel kar dein?')) return;
    try {
      await api.patch('/bookings/' + b._id, { status: 'cancelled' });
      toast('Booking cancel ho gayi');
      load();
    } catch (e) {
      toast('Cancel nahi hua');
    }
  };

  return (
    <div className="card">
      <div className="hd"><h2>Advance bookings</h2><div className="spacer"></div>
        {bookings.length > 0 && (
          <div className="seg" style={{ width: 'auto' }}>
            <button aria-pressed={view === 'list'} onClick={() => { setView('list'); setDayFilter(null); }}>List</button>
            <button aria-pressed={view === 'cal'} onClick={() => setView('cal')}>Calendar</button>
          </div>
        )}
        <button className="btn sm" onClick={() => setSheetOpen(true)}>+ New booking</button>
      </div>
      <div className="bd">
        {!bookings.length && <p className="hint" style={{ margin: 0 }}>Koi pending booking nahi hai.</p>}
        {view === 'cal' && bookings.length > 0 && <BookingCalendar bookings={bookings} selected={dayFilter} onSelect={setDayFilter} />}
        {view === 'cal' && dayFilter && !bookings.some(b => b.eventDate === dayFilter) && <p className="hint">{prettyDate(dayFilter)} ko koi booking nahi.</p>}
        {bookings.filter(b => !dayFilter || b.eventDate === dayFilter).map(b => (
          <div className="sess" key={b._id} style={{ borderColor: 'var(--accent)', background: 'var(--accent-soft)' }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <b>{b.name}</b>{b.phone ? ' · ' + b.phone : ''}<br />
              <span className="hint">
                {prettyDate(b.eventDate)}{b.guests ? ' · ' + b.guests + ' guests' : ''}{' · ' + (b.tablesCount || 1) + ' table' + ((b.tablesCount || 1) > 1 ? 's' : '')}
                {b.advance ? ' · advance ' + INR(b.advance) + ' (' + b.advanceMode + ')' : ''}
                {balanceOf(b) > 0 ? ' · balance ~' + INR(balanceOf(b)) : ''}
              </span>
              {b.note && <><br /><span className="hint">{b.note}</span></>}
            </span>
            <button className="btn sm dark" onClick={() => setAssigning(b)}>Tables assign karein</button>
            <button className="btn sm" onClick={() => onUseBooking(b)}>Ek table chunein</button>
            <button className="btn sm ghost" onClick={() => setReceiptFor(b)}>Receipt</button>
            {b.phone && <button className="btn sm ghost" onClick={() => openWhatsApp(b.phone, reminderText(b, shopName))}>Reminder</button>}
            <button className="btn sm ghost" onClick={() => cancel(b)}>Cancel</button>
          </div>
        ))}
      </div>
      <AssignTablesSheet booking={assigning} freeTables={freeTables} onClose={() => setAssigning(null)}
        onAssigned={(orders) => { setAssigning(null); load(); onAssigned(orders); }} />
      <NewBookingSheet open={sheetOpen} tables={tables} onClose={() => setSheetOpen(false)}
        onCreated={(b) => { setSheetOpen(false); load(); if (b.advance > 0) setReceiptFor(b); }} />
      <Sheet open={!!receiptFor} onClose={() => setReceiptFor(null)}>
        {receiptFor && (
          <>
            <h2 style={{ margin: '0 0 6px', fontSize: 17 }}>Advance receipt — {receiptFor.name}</h2>
            <p className="hint" style={{ margin: '0 0 14px' }}>
              {prettyDate(receiptFor.eventDate)} · advance {INR(receiptFor.advance || 0)} ({receiptFor.advanceMode})
              {balanceOf(receiptFor) > 0 ? ' · balance ~' + INR(balanceOf(receiptFor)) : ''}
            </p>
            <div className="row">
              <button className="btn" onClick={() => printReceipt(receiptFor)}>Print receipt</button>
              {receiptFor.phone && <button className="btn" onClick={() => openWhatsApp(receiptFor.phone, receiptText(receiptFor, shopName))}>WhatsApp</button>}
            </div>
            <button className="btn primary" style={{ width: '100%', marginTop: 10 }} onClick={() => setReceiptFor(null)}>Done</button>
          </>
        )}
      </Sheet>
    </div>
  );
}
