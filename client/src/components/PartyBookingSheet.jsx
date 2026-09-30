import { useEffect, useState } from 'react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { useConfig } from '../context/ConfigContext';
import { INR } from '../utils/money';
import { prettyDate, dstr } from '../utils/date';
import { esc } from '../utils/html';
import { openWhatsApp } from '../utils/notify';
import Sheet from './Sheet';

// Mirrors the paper "Party Booking Form" + "Estimate Calculation" sheet.
const TIMINGS = ['11:30 am - 2:30 pm', '4:00 pm - 7:00 pm', '8:00 pm - 11:00 pm', 'Other'];
const FOOD_PACKAGES = ['Premium', 'Signature', 'Elite', 'Majestic'];
const THEMES = ['Barbie', 'Butterfly', 'Cars', 'Candy', 'Dinosaur', 'Frozen', 'Jungle', 'Lego', 'Mario', 'Mermaid',
  'Paw Patrol', 'Peppa Pig', 'Princess', 'Science', 'Space', 'SpiderMan', 'SuperHero', 'Unicorn', 'Other'];
const ADDONS = ['Live Station 1', 'Live Station 2', 'Additional Food', 'Pinata', 'Game Coordinator', 'Magic Show',
  'Décor', 'Valet Parking', 'Tattoo Artist + Face Painting', 'Balloon Shower', 'Photographer + Reel', 'Videographer',
  'Mini Salon', 'Caricature'];
const PAY_MODES = ['CASH', 'UPI', 'CARD'];

const n = v => Math.max(0, Number(v) || 0);
const withTax = (amt, pct) => Math.round(amt * (1 + n(pct) / 100));

function blankParty() {
  const today = dstr();
  return {
    enquiryDate: today, bookingDate: today, reference: '', branch: '',
    partyDate: today, childName: '', dob: '', school: '',
    packageType: 'Exclusive', timing: TIMINGS[0], timingOther: '',
    foodPref: 'Veg', foodPackage: 'Elite',
    kids: { count: 0, rate: 0 }, adults: { count: 0, rate: 0 }, nanny: { count: 0, rate: 0 },
    foodGst: 5, serviceCharge: 0,
    playRate: 0, playKids: 0,
    theme: '', themeOther: '', balloons: '',
    addons: ADDONS.map(name => ({ name, on: false, amount: 0, gst: 18 })),
    requirements: '',
    motherName: '', motherPhone: '', fatherName: '', fatherPhone: '',
    advance: 0, advanceMode: 'CASH', nextPaymentDate: '',
    mgInc: { kids: 0, adults: 0, nanny: 0, driver: 0, socks: 0 }, socksRate: 0
  };
}

// Old bookings / quick bookings → a full form, keeping whatever they had.
function partyFromBooking(b) {
  const p = { ...blankParty(), ...(b.party || {}) };
  if (!b.party) {
    p.partyDate = b.eventDate; p.childName = b.name === 'Walk-in' ? '' : b.name;
    p.motherPhone = b.phone || ''; p.requirements = b.note || '';
  }
  p.advance = b.advance || 0; p.advanceMode = b.advanceMode || 'CASH';
  const names = new Set(p.addons.map(a => a.name));
  p.addons = [...p.addons, ...ADDONS.filter(x => !names.has(x)).map(name => ({ name, on: false, amount: 0, gst: 18 }))];
  return p;
}

export function nth(k) {
  const s = ['th', 'st', 'nd', 'rd'], v = k % 100;
  return k + (s[(v - 20) % 10] || s[v] || s[0]);
}

function birthdayNo(p) {
  if (!p.dob || !p.partyDate) return 0;
  const age = Number(p.partyDate.slice(0, 4)) - Number(p.dob.slice(0, 4));
  return age > 0 && age < 30 ? age : 0;
}

function dayInfo(s) {
  if (!s) return { day: '', weekend: false };
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return { day: dt.toLocaleDateString('en-IN', { weekday: 'long' }), weekend: dt.getDay() === 0 || dt.getDay() === 6 };
}

// Every line of the estimate. `final` adds the MG increase the host confirms
// a week before the party (kids / adults / nanny / driver boxes / socks).
export function calcParty(p) {
  const foodPct = n(p.foodGst) + n(p.serviceCharge);
  const inc = p.mgInc || {};
  // `part` tags each line Play or Food on the one party bill: play never
  // gets GST, food + add-ons carry their own %.
  const food = (label, c, rate) => ({ part: 'food', label, detail: `${c} × ${INR(rate)} + ${foodPct}%`, count: c, amount: withTax(c * n(rate), foodPct) });
  const build = final => {
    const kidsC = n(p.kids.count) + (final ? n(inc.kids) : 0);
    const adultsC = n(p.adults.count) + (final ? n(inc.adults) : 0);
    const nannyC = n(p.nanny.count) + (final ? n(inc.nanny) + n(inc.driver) : 0);
    const lines = [];
    if (kidsC || n(p.kids.rate)) lines.push(food('Food — Kids', kidsC, p.kids.rate));
    if (adultsC || n(p.adults.rate)) lines.push(food('Food — Adults', adultsC, p.adults.rate));
    if (nannyC || n(p.nanny.rate)) lines.push(food('Nanny / Driver boxes', nannyC, p.nanny.rate));
    const foodTotal = lines.reduce((a, l) => a + l.amount, 0);
    // Play is per child (kids MG, or a separate play head-count, plus any
    // kids added by the MG increase). No GST on play. Bookings saved before
    // per-child pricing keep their lump play amount until a rate is typed.
    let play = 0;
    if (n(p.playRate)) {
      const pk = (n(p.playKids) || n(p.kids.count)) + (final ? n(inc.kids) : 0);
      play = Math.round(pk * n(p.playRate));
      lines.push({ part: 'play', label: 'Play area', detail: `${pk} kids × ${INR(p.playRate)} (no GST)`, count: pk, amount: play });
    } else if (n(p.playAmount)) {
      play = Math.round(n(p.playAmount));
      lines.push({ part: 'play', label: 'Play area package', detail: `${INR(p.playAmount)} (no GST)`, amount: play });
    }
    (p.addons || []).filter(a => a.on).forEach(a => lines.push({
      part: 'food', label: a.name, detail: n(a.amount) ? `${INR(a.amount)} + ${n(a.gst)}% GST` : 'Included', amount: withTax(n(a.amount), a.gst)
    }));
    // Extra items ordered during the party (on top of the final menu) — food
    // bill, same GST/service % as the party food.
    if (final) (p.extras || []).forEach(x => lines.push({
      part: 'food', extra: true, label: 'Extra: ' + x.name, detail: `${n(x.qty)} × ${INR(x.rate)} + ${foodPct}%`, amount: withTax(n(x.qty) * n(x.rate), foodPct)
    }));
    const socks = final ? n(inc.socks) * n(p.socksRate) : 0;
    if (socks) lines.push({ part: 'play', label: 'Socks', detail: `${n(inc.socks)} × ${INR(p.socksRate)}`, amount: socks });
    const total = lines.reduce((a, l) => a + l.amount, 0);
    const playBill = lines.filter(l => l.part === 'play').reduce((a, l) => a + l.amount, 0);
    return { lines, foodTotal, play, total, playBill, foodBill: total - playBill, kids: kidsC, adults: adultsC };
  };
  const est = build(false);
  const fin = build(true);
  const hasInc = Object.values(inc).some(v => n(v) > 0) || (p.extras || []).length > 0;
  const total = fin.total;
  const advance = n(p.advance);
  return {
    est, fin, hasInc, total, advance,
    minAdvance: Math.ceil(total * 0.25),
    balance: Math.max(0, total - advance)
  };
}

function themeOf(p) { return p.theme === 'Other' ? (p.themeOther || 'Other') : p.theme; }
function timingOf(p) { return p.timing === 'Other' ? (p.timingOther || 'Other') : p.timing; }

function estimateRowsHTML(c) {
  return c.lines.map(l => `<tr><td>${esc(l.label)}</td><td>${esc(l.detail)}</td><td class="rt">${INR(l.amount)}</td></tr>`).join('');
}

// A4 printout laid out like the paper form: details on top, estimate table below.
export function partyFormHTML(p, shopName) {
  const c = calcParty(p);
  const bd = birthdayNo(p);
  const { day, weekend } = dayInfo(p.partyDate);
  const row = (a, b) => `<tr><th>${a}</th><td>${b || '&nbsp;'}</td></tr>`;
  const acts = (p.addons || []).filter(a => a.on).map(a => esc(a.name)).join(', ');
  const inc = p.mgInc || {};
  return `<div class="pf">
    <div class="pf-hd"><b>${esc(shopName)}</b><span>PARTY BOOKING FORM${bd ? ' · ' + nth(bd).toUpperCase() + ' BIRTHDAY' : ''}</span></div>
    <table class="pf-grid"><tr><td>
      <table class="pf-kv">
        ${row('Enquiry date', p.enquiryDate ? prettyDate(p.enquiryDate) : '')}
        ${row('Party date', p.partyDate ? prettyDate(p.partyDate) : '')}
        ${row("Child's name", esc(p.childName))}
        ${row('School', esc(p.school))}
        ${row('Package', `${weekend ? 'Weekend' : 'Weekday'} · ${esc(p.packageType)}`)}
        ${row('Timing', esc(timingOf(p)))}
        ${row('Food package', `${esc(p.foodPackage)} · ${esc(p.foodPref)}`)}
      </table></td><td>
      <table class="pf-kv">
        ${row('Booking date', p.bookingDate ? prettyDate(p.bookingDate) : '')}
        ${row('Day', esc(day))}
        ${row('DOB', p.dob ? prettyDate(p.dob) : '')}
        ${row('Branch', esc(p.branch))}
        ${row('Reference', esc(p.reference))}
        ${row('Theme', esc(themeOf(p)))}
        ${row('Balloons', esc(p.balloons))}
      </table></td></tr></table>
    <table class="pf-kv">
      ${row('Kids MG', `${n(p.kids.count)} @ ${INR(p.kids.rate)} + ${n(p.foodGst) + n(p.serviceCharge)}%`)}
      ${row('Adults MG', `${n(p.adults.count)} @ ${INR(p.adults.rate)} + ${n(p.foodGst) + n(p.serviceCharge)}%`)}
      ${row('Nanny / Driver MG', `${n(p.nanny.count)} boxes @ ${INR(p.nanny.rate)}`)}
      ${row('Activities / Add-ons', acts)}
      ${row('Additional requirements', esc(p.requirements))}
      ${row('Mother', `${esc(p.motherName)}${p.motherPhone ? ' · ' + esc(p.motherPhone) : ''}`)}
      ${row('Father', `${esc(p.fatherName)}${p.fatherPhone ? ' · ' + esc(p.fatherPhone) : ''}`)}
    </table>
    <div class="pf-sub">ESTIMATE CALCULATION</div>
    <table class="pf-est"><tr><th>Particulars</th><th>Count / Cost</th><th class="rt">Amount</th></tr>
      ${estimateRowsHTML(c.est)}
      <tr><td colspan="2">Play (no GST)</td><td class="rt">${INR(c.est.playBill)}</td></tr>
      <tr><td colspan="2">Food + add-ons (incl. GST)</td><td class="rt">${INR(c.est.foodBill)}</td></tr>
      <tr class="pf-tot"><td colspan="2">Estimate total (as per MG)</td><td class="rt">${INR(c.est.total)}</td></tr>
    </table>
    ${c.hasInc ? `<div class="pf-sub">FINAL — MG INCREASE (Kids ${n(inc.kids)}, Adults ${n(inc.adults)}, Nanny ${n(inc.nanny)}, Driver ${n(inc.driver)}, Socks ${n(inc.socks)})${(p.extras || []).length ? ' + EXTRA ORDER' : ''}</div>
    <table class="pf-est">${estimateRowsHTML(c.fin)}
      <tr><td colspan="2">Play (no GST)</td><td class="rt">${INR(c.fin.playBill)}</td></tr>
      <tr><td colspan="2">Food + add-ons (incl. GST)</td><td class="rt">${INR(c.fin.foodBill)}</td></tr>
      <tr class="pf-tot"><td colspan="2">Final total</td><td class="rt">${INR(c.fin.total)}</td></tr></table>` : ''}
    <table class="pf-kv" style="margin-top:8px">
      ${row('Total payment', INR(c.total))}
      ${row('Advance', `${INR(c.advance)} (${esc(p.advanceMode)})${c.advance < c.minAdvance ? ' — min 25% = ' + INR(c.minAdvance) : ''}`)}
      ${row('Next payment date', p.nextPaymentDate ? prettyDate(p.nextPaymentDate) : '')}
      ${row('Balance (before party starts)', INR(c.balance))}
    </table>
    <p class="pf-note">Note: This is only the estimate calculation. If you increase the number of guests or take any extra add-ons, an additional payment will be applicable. Minimum 25% advance is required to confirm the booking; MG increase to be confirmed at least a week prior to the party. Food preparation will strictly be done as per the Minimum Guarantee.</p>
    <table class="pf-sign"><tr><td>Parent's signature</td><td>For ${esc(shopName)}</td></tr></table>
  </div>`;
}

function estimateText(p, shopName) {
  const c = calcParty(p);
  const bd = birthdayNo(p);
  return [
    `*${shopName}* — Party estimate`,
    `${p.childName || ''}${bd ? ` · ${nth(bd)} Birthday` : ''}`,
    p.partyDate ? `Date: ${prettyDate(p.partyDate)} · ${timingOf(p)}` : null, '',
    ...c.fin.lines.map(l => `${l.label}: ${l.detail} = ${INR(l.amount)}`), '',
    `Play: ${INR(c.fin.playBill)} · Food: ${INR(c.fin.foodBill)}`,
    `*Total: ${INR(c.total)}*`,
    c.advance ? `Advance: ${INR(c.advance)} (${p.advanceMode})` : `Advance (min 25%): ${INR(c.minAdvance)}`,
    c.advance ? `Balance: ${INR(c.balance)}` : null, '',
    '_This is only the estimate. Extra guests or add-ons will be charged additionally._'
  ].filter(l => l !== null).join('\n');
}

function Seg({ options, value, onChange }) {
  return (
    <div className="seg" style={{ flexWrap: 'wrap' }}>
      {options.map(o => <button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(o)}>{o}</button>)}
    </div>
  );
}

function Num({ label, value, onChange, flex = '1 1 90px' }) {
  return (
    <label className="f" style={{ flex }}><span>{label}</span>
      <input type="number" min="0" value={value || ''} placeholder="0" onChange={e => onChange(n(e.target.value))} /></label>
  );
}

function Txt({ label, value, onChange, type = 'text', flex = '1 1 160px', ...rest }) {
  return (
    <label className="f" style={{ flex }}><span>{label}</span>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} {...rest} /></label>
  );
}

function Section({ title, children }) {
  return (
    <div className="pfsec">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

// prefill: fields to start a new form with (e.g. from a party enquiry).
export default function PartyBookingSheet({ open, booking, prefill, onClose, onSaved }) {
  const toast = useToast();
  const { config } = useConfig();
  const shopName = (config && config.shopName) || 'Funny Mouse';
  const [p, setP] = useState(blankParty);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setP(booking ? partyFromBooking(booking) : { ...blankParty(), ...(prefill || {}) });
  }, [open, booking]);

  const set = (k, v) => setP(prev => ({ ...prev, [k]: v }));
  const setIn = (k, sub, v) => setP(prev => ({ ...prev, [k]: { ...prev[k], [sub]: v } }));
  const setAddon = (ix, patch) => setP(prev => ({ ...prev, addons: prev.addons.map((a, i) => i === ix ? { ...a, ...patch } : a) }));

  const c = calcParty(p);
  const bd = birthdayNo(p);
  const { day, weekend } = dayInfo(p.partyDate);

  const printForm = () => {
    const area = document.getElementById('printarea');
    if (!area) return;
    area.innerHTML = partyFormHTML(p, shopName);
    area.className = 'a4';
    window.print();
    area.className = '';
  };

  const save = async () => {
    if (!p.partyDate) { toast('Party date chahiye'); return; }
    setBusy(true);
    const payload = {
      name: p.childName || p.motherName || p.fatherName || 'Walk-in',
      phone: (p.motherPhone || p.fatherPhone || '').replace(/\D/g, '').slice(-10),
      eventDate: p.partyDate,
      guests: c.fin.kids + c.fin.adults,
      advance: c.advance, advanceMode: p.advanceMode,
      estimate: c.total,
      note: [bd ? nth(bd) + ' Birthday' : 'Party', themeOf(p) && themeOf(p) + ' theme', timingOf(p)].filter(Boolean).join(' · '),
      party: p
    };
    try {
      const { data } = booking
        ? await api.patch('/bookings/' + booking._id, payload)
        : await api.post('/bookings', payload);
      toast(booking ? 'Party booking update ho gayi' : 'Party booking save ho gayi');
      onSaved(data.booking);
    } catch (e) {
      toast((e.response && e.response.data && e.response.data.message) || 'Booking save nahi hui');
    } finally {
      setBusy(false);
    }
  };

  const foodPct = n(p.foodGst) + n(p.serviceCharge);

  return (
    <Sheet open={open} onClose={onClose} wide>
      <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>Party Booking Form{bd ? ` · ${nth(bd)} Birthday` : ''}</h2>
      <p className="hint" style={{ margin: '0 0 14px' }}>Form bharte hi neeche estimate apne aap calculate hota hai.</p>

      <Section title="Booking">
        <div className="row">
          <Txt label="Enquiry date" type="date" value={p.enquiryDate} onChange={v => set('enquiryDate', v)} />
          <Txt label="Booking date" type="date" value={p.bookingDate} onChange={v => set('bookingDate', v)} />
          <Txt label="Reference" value={p.reference} onChange={v => set('reference', v)} placeholder="e.g. Party guest, Instagram" />
        </div>
        <div className="row">
          <Txt label={'Party date' + (day ? ` (${day} · ${weekend ? 'Weekend' : 'Weekday'})` : '')} type="date" value={p.partyDate} onChange={v => set('partyDate', v)} />
          <Txt label="Branch" value={p.branch} onChange={v => set('branch', v)} />
        </div>
        <span className="hint" style={{ display: 'block', marginBottom: 5 }}>Package type</span>
        <Seg options={['Exclusive', 'Non-Exclusive']} value={p.packageType} onChange={v => set('packageType', v)} />
        <p className="hint" style={{ margin: '4px 0 11px', fontSize: 12 }}>Non-Exclusive me walk-ins, play dates aur doosri bookings saath chal sakti hain.</p>
        <span className="hint" style={{ display: 'block', marginBottom: 5 }}>Timings</span>
        <Seg options={TIMINGS} value={p.timing} onChange={v => set('timing', v)} />
        {p.timing === 'Other' && <div style={{ marginTop: 8 }}><Txt label="Other timing" value={p.timingOther} onChange={v => set('timingOther', v)} placeholder="e.g. 12 to 3" /></div>}
        <div style={{ height: 11 }} />
      </Section>

      <Section title="Child">
        <div className="row">
          <Txt label="Child's full name" value={p.childName} onChange={v => set('childName', v)} />
          <Txt label={'DOB' + (bd ? ` (${nth(bd)} birthday)` : '')} type="date" value={p.dob} onChange={v => set('dob', v)} />
        </div>
        <Txt label="School name" value={p.school} onChange={v => set('school', v)} />
      </Section>

      <Section title="Food package">
        <div className="row" style={{ marginBottom: 11 }}>
          <div style={{ flex: '2 1 240px' }}><Seg options={FOOD_PACKAGES} value={p.foodPackage} onChange={v => set('foodPackage', v)} /></div>
          <div style={{ flex: '1 1 140px' }}><Seg options={['Veg', 'Non-Veg']} value={p.foodPref} onChange={v => set('foodPref', v)} /></div>
        </div>
        <div className="row">
          <Num label="Kids MG" value={p.kids.count} onChange={v => setIn('kids', 'count', v)} />
          <Num label="Rate / kid" value={p.kids.rate} onChange={v => setIn('kids', 'rate', v)} />
          <Num label="Adults MG" value={p.adults.count} onChange={v => setIn('adults', 'count', v)} />
          <Num label="Rate / adult" value={p.adults.rate} onChange={v => setIn('adults', 'rate', v)} />
        </div>
        <div className="row">
          <Num label="Nanny / Driver boxes" value={p.nanny.count} onChange={v => setIn('nanny', 'count', v)} />
          <Num label="Rate / box" value={p.nanny.rate} onChange={v => setIn('nanny', 'rate', v)} />
          <Num label="Food GST %" value={p.foodGst} onChange={v => set('foodGst', v)} />
          <Num label="Service charge %" value={p.serviceCharge} onChange={v => set('serviceCharge', v)} />
        </div>
        <p className="hint" style={{ margin: '-4px 0 11px', fontSize: 12 }}>Food preparation strictly Minimum Guarantee (MG) ke hisaab se hoga. Food total: <b>{INR(c.est.foodTotal)}</b> (incl. {foodPct}%)</p>
      </Section>

      <Section title="Play area (per child · no GST)">
        <div className="row">
          <Num label="Rate per child" value={p.playRate} onChange={v => set('playRate', v)} />
          <Num label={`Play kids (khali = Kids MG ${n(p.kids.count)})`} value={p.playKids} onChange={v => set('playKids', v)} flex="1 1 160px" />
        </div>
        {!n(p.playRate) && n(p.playAmount) > 0 && <p className="hint" style={{ margin: '-4px 0 8px', fontSize: 12 }}>Purana play package amount {INR(p.playAmount)} laga hai — per child rate bharte hi wo hat jayega.</p>}
        <p className="hint" style={{ margin: '-4px 0 11px', fontSize: 12 }}>Play par GST nahi lagta. Play total: <b>{INR(c.est.play)}</b>{n(p.playRate) ? ` (${(n(p.playKids) || n(p.kids.count))} kids × ${INR(p.playRate)})` : ''}</p>
      </Section>

      <Section title="Theme & décor">
        <div className="chips" style={{ marginBottom: 11 }}>
          {THEMES.map(t => <button key={t} type="button" className="chip" aria-pressed={p.theme === t} onClick={() => set('theme', p.theme === t ? '' : t)}>{t}</button>)}
        </div>
        <div className="row">
          {p.theme === 'Other' && <Txt label="Theme (other)" value={p.themeOther} onChange={v => set('themeOther', v)} placeholder="e.g. Carnival" />}
          <Txt label="Balloons colour" value={p.balloons} onChange={v => set('balloons', v)} />
        </div>
      </Section>

      <Section title="Activities / Add-ons">
        <p className="hint" style={{ margin: '0 0 8px', fontSize: 12 }}>Jo chahiye use tick karein. Amount 0 = package me included.</p>
        {p.addons.map((a, ix) => (
          <div className="splitrow" key={ix}>
            <input type="checkbox" checked={a.on} onChange={e => setAddon(ix, { on: e.target.checked })} aria-label={a.name} />
            {ADDONS.includes(a.name)
              ? <span style={{ flex: 1, minWidth: 0 }}>{a.name}</span>
              : <input type="text" value={a.name} onChange={e => setAddon(ix, { name: e.target.value })} style={{ flex: 1, minWidth: 0, padding: '7px 9px' }} />}
            {a.on && <>
              <input type="number" min="0" placeholder="₹" value={a.amount || ''} onChange={e => setAddon(ix, { amount: n(e.target.value) })} style={{ width: 96, padding: '7px 9px' }} aria-label={a.name + ' amount'} />
              <select value={a.gst} onChange={e => setAddon(ix, { gst: n(e.target.value) })} style={{ width: 78, padding: '7px 6px' }} aria-label={a.name + ' GST'}>
                {[0, 5, 18].map(g => <option key={g} value={g}>{g}%</option>)}
              </select>
            </>}
          </div>
        ))}
        <button type="button" className="btn sm ghost" style={{ margin: '8px 0 11px' }}
          onClick={() => set('addons', [...p.addons, { name: '', on: true, amount: 0, gst: 18 }])}>+ Aur item</button>
        <label className="f"><span>Any additional requirements</span>
          <textarea rows={3} value={p.requirements} onChange={e => set('requirements', e.target.value)} placeholder="e.g. Mickey mascot, crowning, return gifts, pom pom dance…" /></label>
      </Section>

      <Section title="Parent's details">
        <div className="row">
          <Txt label="Mother's full name" value={p.motherName} onChange={v => set('motherName', v)} />
          <Txt label="Contact no." type="tel" inputMode="numeric" maxLength={10} value={p.motherPhone} onChange={v => set('motherPhone', v.replace(/\D/g, '').slice(0, 10))} />
        </div>
        <div className="row">
          <Txt label="Father's full name" value={p.fatherName} onChange={v => set('fatherName', v)} />
          <Txt label="Contact no." type="tel" inputMode="numeric" maxLength={10} value={p.fatherPhone} onChange={v => set('fatherPhone', v.replace(/\D/g, '').slice(0, 10))} />
        </div>
      </Section>

      <Section title="MG increase (host confirm kare — party se 1 hafta pehle)">
        <div className="row">
          <Num label="Kids +" value={p.mgInc.kids} onChange={v => setIn('mgInc', 'kids', v)} flex="1 1 70px" />
          <Num label="Adults +" value={p.mgInc.adults} onChange={v => setIn('mgInc', 'adults', v)} flex="1 1 70px" />
          <Num label="Nanny +" value={p.mgInc.nanny} onChange={v => setIn('mgInc', 'nanny', v)} flex="1 1 70px" />
          <Num label="Driver +" value={p.mgInc.driver} onChange={v => setIn('mgInc', 'driver', v)} flex="1 1 70px" />
          <Num label="Socks" value={p.mgInc.socks} onChange={v => setIn('mgInc', 'socks', v)} flex="1 1 70px" />
          {n(p.mgInc.socks) > 0 && <Num label="Rate / socks" value={p.socksRate} onChange={v => set('socksRate', v)} flex="1 1 70px" />}
        </div>
      </Section>

      <Section title="Estimate calculation">
        <div className="scrollx">
          <table className="tb">
            <thead><tr><th>Particulars</th><th>Count / cost</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
            <tbody>
              {c.fin.lines.length === 0 && <tr><td colSpan={3} className="hint">Upar MG, play package ya add-ons bharein.</td></tr>}
              {c.fin.lines.map((l, i) => (
                <tr key={i}><td>{l.label} <span className="badge" style={l.part === 'play' ? undefined : { background: 'var(--berry-soft)', color: 'var(--berry)' }}>{l.part === 'play' ? 'Play' : 'Food'}</span></td><td className="hint">{l.detail}</td><td style={{ textAlign: 'right' }}>{INR(l.amount)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="stats" style={{ margin: '12px 0' }}>
          {c.hasInc && <div className="stat"><small>Estimate (MG)</small><b>{INR(c.est.total)}</b></div>}
          <div className="stat"><small>Play (no GST)</small><b>{INR(c.fin.playBill)}</b></div>
          <div className="stat"><small>Food + add-ons</small><b>{INR(c.fin.foodBill)}</b></div>
          <div className="stat"><small>{c.hasInc ? 'Final (MG increase / extra ke saath)' : 'Grand total'}</small><b>{INR(c.total)}</b></div>
          <div className="stat"><small>Min 25% advance</small><b>{INR(c.minAdvance)}</b></div>
        </div>
      </Section>

      <Section title="Payment">
        <div className="row">
          <Num label="Advance received" value={p.advance} onChange={v => set('advance', v)} flex="1 1 130px" />
          <div style={{ flex: '1 1 180px' }}>
            <span className="hint" style={{ display: 'block', marginBottom: 5 }}>Mode</span>
            <Seg options={PAY_MODES} value={p.advanceMode} onChange={v => set('advanceMode', v)} />
          </div>
        </div>
        <Txt label="Next payment date (min 25% within 48 hrs)" type="date" value={p.nextPaymentDate} onChange={v => set('nextPaymentDate', v)} />
        {c.total > 0 && c.advance < c.minAdvance && <p className="hint" style={{ color: 'var(--berry)', margin: '0 0 8px' }}>Booking confirm karne ke liye kam se kam {INR(c.minAdvance)} (25%) advance chahiye.</p>}
        <p style={{ margin: '0 0 12px' }}>Balance (party shuru hone se pehle): <b>{INR(c.balance)}</b></p>
      </Section>

      <div className="row">
        <button type="button" className="btn" onClick={printForm}>Print form + estimate</button>
        {(p.motherPhone || p.fatherPhone) && <button type="button" className="btn" onClick={() => openWhatsApp(p.motherPhone || p.fatherPhone, estimateText(p, shopName))}>WhatsApp estimate</button>}
      </div>
      <button className="btn primary" style={{ width: '100%', padding: 14, marginTop: 10 }} disabled={busy} onClick={save}>
        {busy ? 'Saving…' : booking ? 'Booking update karein' : 'Party booking save karein'}
      </button>
    </Sheet>
  );
}
