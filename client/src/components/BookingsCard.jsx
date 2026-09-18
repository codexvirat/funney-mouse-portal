import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { INR } from '../utils/money';
import { prettyDate, dstr } from '../utils/date';
import Sheet from './Sheet';

const PAY_MODES = ['CASH', 'UPI', 'CARD'];

function NewBookingSheet({ open, onClose, onCreated }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [eventDate, setEventDate] = useState(dstr());
  const [guests, setGuests] = useState(0);
  const [advance, setAdvance] = useState(0);
  const [advanceMode, setAdvanceMode] = useState('CASH');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(''); setPhone(''); setEventDate(dstr()); setGuests(0);
      setAdvance(0); setAdvanceMode('CASH'); setNote('');
    }
  }, [open]);

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/bookings', {
        name: name || 'Walk-in', phone, eventDate, guests, advance, advanceMode, note
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
          <input type="number" min="0" value={guests || ''} onChange={e => setGuests(Number(e.target.value) || 0)} /></label>
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
      <label className="f"><span>Note (optional)</span>
        <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Birthday party, 15 kids" />
      </label>
      <button className="btn primary" style={{ width: '100%', padding: 14, marginTop: 6 }} disabled={busy} onClick={save}>
        {busy ? 'Saving…' : 'Booking save karein'}
      </button>
    </Sheet>
  );
}

export default function BookingsCard({ onUseBooking }) {
  const toast = useToast();
  const [bookings, setBookings] = useState([]);
  const [sheetOpen, setSheetOpen] = useState(false);

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
        <button className="btn sm" onClick={() => setSheetOpen(true)}>+ New booking</button>
      </div>
      <div className="bd">
        {!bookings.length && <p className="hint" style={{ margin: 0 }}>Koi pending booking nahi hai.</p>}
        {bookings.map(b => (
          <div className="sess" key={b._id} style={{ borderColor: 'var(--accent)', background: 'var(--accent-soft)' }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <b>{b.name}</b>{b.phone ? ' · ' + b.phone : ''}<br />
              <span className="hint">
                {prettyDate(b.eventDate)}{b.guests ? ' · ' + b.guests + ' guests' : ''}
                {b.advance ? ' · advance ' + INR(b.advance) + ' (' + b.advanceMode + ')' : ''}
              </span>
              {b.note && <><br /><span className="hint">{b.note}</span></>}
            </span>
            <button className="btn sm dark" onClick={() => onUseBooking(b)}>Table open karein</button>
            <button className="btn sm ghost" onClick={() => cancel(b)}>Cancel</button>
          </div>
        ))}
      </div>
      <NewBookingSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onCreated={() => { setSheetOpen(false); load(); }} />
    </div>
  );
}
