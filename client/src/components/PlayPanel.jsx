import api from '../api/client';
import { INR } from '../utils/money';
import { priceForMinutes, slabSorted } from '../utils/bill';
import { memberActive, memberLabel } from '../utils/member';

export default function PlayPanel({
  config, cust, useMember, setUseMember, playKids, setPlayKids,
  playSlab, setPlaySlab, playCustom, setPlayCustom, onAdd, toast, onStartTimer
}) {
  const mem = cust && cust.membership;
  const visitPass = !!(mem && mem.kind === 'visits');
  // A limited visit pass must have a visit left for every kid on this entry.
  const visitsShort = visitPass && mem.visits > 0 && (mem.visitsLeft || 0) < playKids;
  const canMember = memberActive(cust) && !visitsShort;
  const slabs = slabSorted(config);
  const mins = playCustom || (slabs.find(s => s.id === playSlab) || slabs[0] || { minutes: 60 }).minutes;
  const amt = (useMember && canMember) ? 0 : priceForMinutes(config, mins) * playKids;

  const bumpKids = (d) => setPlayKids(k => Math.max(1, Math.min(20, k + d)));

  const addPlay = () => {
    const m = playCustom || mins;
    const member = useMember && canMember;
    const rate = member ? 0 : priceForMinutes(config, m);
    onAdd({
      cat: 'play', name: member ? 'Play (membership)' : 'Play area',
      qty: playKids, rate, amount: rate * playKids,
      meta: { minutes: m, kids: playKids, member }
    });
    toast('Play added');
  };

  const startSession = async () => {
    if (onStartTimer) { await onStartTimer(); return; }
    try {
      await api.post('/sessions', {
        kids: playKids, phone: (cust && cust.phone) || '', name: (cust && cust.name) || 'Walk-in',
        member: !!(useMember && canMember), plannedMins: mins
      });
      toast('Timer started');
    } catch (e) {
      toast('Session start fail ho gaya');
    }
  };

  return (
    <>
      <div className="row" style={{ alignItems: 'flex-end', marginBottom: 12 }}>
        <div style={{ flex: '0 0 auto' }}>
          <span className="hint" style={{ display: 'block', marginBottom: 5 }}>Kids</span>
          <div className="stepper">
            <button onClick={() => bumpKids(-1)}>−</button><b>{playKids}</b><button onClick={() => bumpKids(1)}>+</button>
          </div>
        </div>
        <label className="f" style={{ margin: 0, flex: '1 1 150px' }}><span>Ya minutes likhein</span>
          <input type="number" min="0" step="5" placeholder="e.g. 75" value={playCustom || ''} onChange={e => setPlayCustom(Number(e.target.value) || 0)} />
        </label>
      </div>
      <div className="chips" style={{ marginBottom: 12 }}>
        {slabs.map(s => (
          <button key={s.id} className="chip" aria-pressed={!playCustom && playSlab === s.id}
            onClick={() => { setPlaySlab(s.id); setPlayCustom(0); }}>
            {s.label} · {INR(s.price)}
          </button>
        ))}
      </div>
      {canMember && (
        <label style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 12, fontSize: 14 }}>
          <input type="checkbox" checked={useMember} onChange={e => setUseMember(e.target.checked)} style={{ width: 18, height: 18 }} />
          <span>Membership se kaato ({memberLabel(cust)})
            {visitPass && <><br /><span className="hint">{playKids} visit katega · member: {cust.name || cust.phone}{cust.kid ? ' (' + cust.kid + ')' : ''}</span></>}</span>
        </label>
      )}
      {memberActive(cust) && visitsShort && (
        <p className="hint" style={{ color: 'var(--berry)', margin: '0 0 12px' }}>Membership me sirf {mem.visitsLeft || 0} visit bache hain — {playKids} kids ke liye kaafi nahi. Kids kam karein ya pass renew karein.</p>
      )}
      <div className="row">
        <button className="btn dark" style={{ flex: '2 1 200px' }} onClick={addPlay}>Add play · {INR(amt)}</button>
        <button className="btn" style={{ flex: '1 1 140px' }} onClick={startSession}>Start timer</button>
      </div>
      <p className="hint" style={{ margin: '10px 0 0' }}>Timer entry ke liye — check-in karo, jaate waqt "End & bill" dabao, minutes apne aap slab me aa jayenge.</p>
    </>
  );
}
