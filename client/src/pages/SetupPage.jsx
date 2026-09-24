import { useEffect, useState } from 'react';
import api from '../api/client';
import { useConfig } from '../context/ConfigContext';
import { useToast } from '../context/ToastContext';
import { uid } from '../utils/uid';
import { esc } from '../utils/html';
import QRCode from 'qrcode';

function BackupCard() {
  const toast = useToast();
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/admin/backups').then(({ data }) => setInfo(data)).catch(() => setInfo({ backups: [], error: true }));
  }, []);

  const download = async () => {
    setBusy(true);
    try {
      const res = await api.get('/admin/backup', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'funny-mouse-backup-' + new Date().toISOString().slice(0, 10) + '.json.gz';
      a.click();
      URL.revokeObjectURL(url);
      toast('Backup download ho gaya');
    } catch (e) {
      toast('Backup download nahi hua');
    } finally {
      setBusy(false);
    }
  };

  const last = info && info.backups && info.backups[0];
  return (
    <div className="card"><div className="hd"><h2>Data backup</h2></div><div className="bd">
      <p className="hint" style={{ margin: '0 0 10px' }}>
        Server roz apne aap poore data (bills, customers, members, settings) ka backup banata hai aur pichle 30 din ke rakhta hai.
        {last ? ` Last automatic backup: ${last.file.slice(7, 17)} (${Math.round(last.size / 1024)} KB).` : info && !info.error ? ' Abhi tak koi automatic backup nahi bana.' : ''}
      </p>
      <p className="hint" style={{ margin: '0 0 12px' }}>Server kharab ho jaye to bhi data bache, isliye hafte me ek baar backup download karke Google Drive / pen drive me rakh lijiye.</p>
      <button className="btn dark" disabled={busy} onClick={download}>{busy ? 'Ban raha hai…' : 'Abhi backup download karein'}</button>
    </div></div>
  );
}

// One QR sticker per table (thermal printer width), linking to that table's
// order page. Tables only get their secret token once settings are saved.
async function printTableQRs(tables, shopName) {
  const ready = tables.filter(t => t.qrToken);
  const slips = await Promise.all(ready.map(async t => {
    const url = `${window.location.origin}/order/${encodeURIComponent(t.id)}?t=${t.qrToken}`;
    const img = await QRCode.toDataURL(url, { width: 480, margin: 1 });
    return `<div style="text-align:center;padding:6mm 0">
      <h3>${esc(shopName)}</h3>
      <div style="font-size:20px;font-weight:bold;margin:2mm 0">${esc(t.name)}</div>
      <img src="${img}" style="width:60mm;height:60mm" />
      <div style="font-size:12px;margin-top:2mm">Scan karke menu dekhiye aur order kijiye 🍔</div>
    </div>`;
  }));
  const area = document.getElementById('printarea');
  if (area) area.innerHTML = slips.join('<div style="page-break-after:always"></div>');
  // Give the QR images a moment to decode before the print dialog snapshots the page.
  setTimeout(() => window.print(), 300);
}

function UsersCard() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'staff' });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get('/auth/users'); setUsers(data.users); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) { toast('Username aur password chahiye'); return; }
    try {
      await api.post('/auth/users', form);
      setForm({ username: '', password: '', name: '', role: 'staff' });
      toast('User bana diya');
      load();
    } catch (e) {
      toast((e.response && e.response.data && e.response.data.message) || 'User create nahi hua');
    }
  };
  const toggleActive = async (u) => { await api.patch('/auth/users/' + u._id, { active: !u.active }); load(); };
  const remove = async (u) => {
    if (!window.confirm('Ye user delete kar dein?')) return;
    try { await api.delete('/auth/users/' + u._id); load(); }
    catch (e) { toast((e.response && e.response.data && e.response.data.message) || 'Delete nahi hua'); }
  };
  const resetPassword = async (u) => {
    const p = window.prompt(u.role === 'owner' ? 'Naya PIN:' : 'Naya password:');
    if (!p) return;
    await api.patch('/auth/users/' + u._id, { password: p });
    toast((u.role === 'owner' ? 'PIN' : 'Password') + ' change ho gaya');
  };

  const isOwnerRole = form.role === 'owner';

  return (
    <div className="card"><div className="hd"><h2>Users / staff accounts</h2></div><div className="bd">
      <form className="row" onSubmit={create} style={{ marginBottom: 14, alignItems: 'flex-end' }}>
        <label className="f" style={{ margin: 0, flex: '1 1 130px' }}><span>{isOwnerRole ? 'Username (koi bhi)' : 'Username'}</span>
          <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></label>
        <label className="f" style={{ margin: 0, flex: '1 1 130px' }}><span>{isOwnerRole ? 'PIN' : 'Password'}</span>
          <input type="text" inputMode={isOwnerRole ? 'numeric' : undefined} maxLength={isOwnerRole ? 8 : undefined}
            placeholder={isOwnerRole ? 'e.g. 4569' : ''}
            value={form.password}
            onChange={e => setForm({ ...form, password: isOwnerRole ? e.target.value.replace(/\D/g, '').slice(0, 8) : e.target.value })} /></label>
        <label className="f" style={{ margin: 0, flex: '1 1 130px' }}><span>Name</span>
          <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label className="f" style={{ margin: 0, flex: '0 0 150px' }}><span>Role</span>
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            <option value="staff">Staff</option><option value="admin">Admin</option><option value="owner">Owner (reports PIN)</option><option value="kitchen">Kitchen (KOT)</option><option value="captain">Captain / waiter</option>
          </select></label>
        <button className="btn dark" type="submit" style={{ flex: '0 0 auto' }}>+ Add user</button>
      </form>
      <p className="hint" style={{ margin: '0 0 14px' }}>
        Role "Owner" sirf reports dekh sakta hai (Day end — void/settle nahi) aur alag se <b>{window.location.origin}/owner</b> par PIN se login karta hai, poora staff/admin login flow use nahi karna padta.
        Role "Kitchen" normal login page se login karta hai aur sirf table-wise KOT screen dekhta hai — naye food orders aur unka print.
        Role "Captain" (waiter) apne phone se login karke table khol sakta hai, order le sakta hai, KOT bhej sakta hai — aur kitchen "Ready" kare to usko notification aata hai. Bill aur cancel staff/admin hi karenge. User ka "Name" wahi rakhein jo table par Waiter me likha jayega.
      </p>
      {loading ? <p className="hint">Loading…</p> : (
        <div className="scrollx">
          <table className="tb">
            <thead><tr><th>Username</th><th>Name</th><th>Role</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td>{u.username}</td><td>{u.name || '—'}</td><td>{u.role}</td>
                  <td>{u.active ? 'Active' : 'Disabled'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn sm ghost" onClick={() => toggleActive(u)}>{u.active ? 'Disable' : 'Enable'}</button>{' '}
                    <button className="btn sm ghost" onClick={() => resetPassword(u)}>Reset pwd</button>{' '}
                    <button className="btn sm danger" onClick={() => remove(u)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div></div>
  );
}

export default function SetupPage() {
  const { config, save } = useConfig();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (config) setForm(JSON.parse(JSON.stringify(config))); }, [config]);

  if (!form) return <p className="hint">Loading…</p>;

  const setField = (f, v) => setForm(prev => ({ ...prev, [f]: v }));

  const updateSlab = (i, f, v) => setForm(prev => { const arr = [...prev.playSlabs]; arr[i] = { ...arr[i], [f]: f === 'label' ? v : (Number(v) || 0) }; return { ...prev, playSlabs: arr }; });
  const addSlab = () => setForm(prev => ({ ...prev, playSlabs: [...prev.playSlabs, { id: uid(), label: 'New', minutes: 30, price: 0 }] }));
  const delSlab = (i) => setForm(prev => ({ ...prev, playSlabs: prev.playSlabs.filter((_, ix) => ix !== i) }));

  const updateMenu = (i, f, v) => setForm(prev => { const arr = [...prev.menu]; arr[i] = { ...arr[i], [f]: f === 'name' || f === 'category' ? v : (Number(v) || 0) }; return { ...prev, menu: arr }; });
  const setMenuAvailable = (i, v) => setForm(prev => { const arr = [...prev.menu]; arr[i] = { ...arr[i], available: v }; return { ...prev, menu: arr }; });
  const menuCats = [...new Set(form.menu.map(m => m.category).filter(Boolean))];
  const loyalty = form.loyalty || { enabled: false, earnPer: 100, pointValue: 1 };
  const setLoyalty = (f, v) => setForm(prev => ({ ...prev, loyalty: { ...loyalty, [f]: v } }));
  const addMenu = () => setForm(prev => ({ ...prev, menu: [...prev.menu, { id: uid(), name: 'New item', price: 0 }] }));
  const delMenu = (i) => setForm(prev => ({ ...prev, menu: prev.menu.filter((_, ix) => ix !== i) }));

  const updatePlan = (i, f, v) => setForm(prev => { const arr = [...prev.plans]; arr[i] = { ...arr[i], [f]: f === 'name' ? v : (Number(v) || 0) }; return { ...prev, plans: arr }; });
  const addPlan = () => setForm(prev => ({ ...prev, plans: [...prev.plans, { id: uid(), name: 'New plan', price: 0, hours: 0, days: 30, discountPercent: 0 }] }));
  const delPlan = (i) => setForm(prev => ({ ...prev, plans: prev.plans.filter((_, ix) => ix !== i) }));

  const happyHour = form.happyHour || { enabled: false, start: '15:00', end: '18:00', discountPercent: 0 };
  const setHappyHour = (f, v) => setForm(prev => ({ ...prev, happyHour: { ...happyHour, [f]: v } }));

  const tables = form.tables || [];
  const updateTable = (i, f, v) => setForm(prev => { const arr = [...(prev.tables || [])]; arr[i] = { ...arr[i], [f]: f === 'name' ? v : (Number(v) || 0) }; return { ...prev, tables: arr }; });
  const addTable = () => setForm(prev => ({ ...prev, tables: [...(prev.tables || []), { id: uid(), name: 'T' + ((prev.tables || []).length + 1), capacity: 4 }] }));
  const delTable = (i) => setForm(prev => ({ ...prev, tables: (prev.tables || []).filter((_, ix) => ix !== i) }));

  const saveAll = async () => {
    setSaving(true);
    try { await save(form); toast('Settings saved'); }
    catch (e) { toast('Save fail ho gaya'); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div className="card"><div className="hd"><h2>Shop</h2></div><div className="bd">
        <div className="grid2">
          <label className="f"><span>Shop name (receipt par)</span><input type="text" value={form.shopName} onChange={e => setField('shopName', e.target.value)} /></label>
          <label className="f" style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 18 }}>
            <input type="checkbox" checked={form.staffDiscount !== false} onChange={e => setField('staffDiscount', e.target.checked)} style={{ width: 18, height: 18 }} />
            <span style={{ margin: 0 }}>Staff discount de sakta hai</span>
          </label>
          <label className="f"><span>Member discount % (default — food + play par auto lagta hai)</span>
            <input type="number" min="0" max="100" value={form.memberDiscountPercent || 0} onChange={e => setField('memberDiscountPercent', Number(e.target.value) || 0)} />
          </label>
          <label className="f"><span>Min spend (₹) discount ke liye — 0 = koi limit nahi</span>
            <input type="number" min="0" value={form.memberDiscountMinSpend || 0} onChange={e => setField('memberDiscountMinSpend', Number(e.target.value) || 0)} />
          </label>
        </div>
      </div></div>

      <div className="card"><div className="hd"><h2>Food GST</h2></div><div className="bd">
        <div className="row">
          <label className="f" style={{ margin: 0, flex: '1 1 140px' }}><span>CGST %</span>
            <input type="number" min="0" max="100" step="0.1" value={form.cgstPercent || 0} onChange={e => setField('cgstPercent', Number(e.target.value) || 0)} /></label>
          <label className="f" style={{ margin: 0, flex: '1 1 140px' }}><span>SGST %</span>
            <input type="number" min="0" max="100" step="0.1" value={form.sgstPercent || 0} onChange={e => setField('sgstPercent', Number(e.target.value) || 0)} /></label>
        </div>
        <p className="hint" style={{ margin: '10px 0 0' }}>Sirf Food items ke subtotal par lagta hai — Play/Socks/Membership tax-free rahenge. Receipt aur reports dono me CGST/SGST alag line me dikhega.</p>
      </div></div>

      <div className="card"><div className="hd"><h2>Happy hour</h2></div><div className="bd">
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <input type="checkbox" checked={!!happyHour.enabled} onChange={e => setHappyHour('enabled', e.target.checked)} style={{ width: 18, height: 18 }} />
          <span>Happy hour on hai</span>
        </label>
        <div className="row">
          <label className="f" style={{ margin: 0, flex: '1 1 110px' }}><span>Start</span>
            <input type="time" value={happyHour.start} onChange={e => setHappyHour('start', e.target.value)} /></label>
          <label className="f" style={{ margin: 0, flex: '1 1 110px' }}><span>End</span>
            <input type="time" value={happyHour.end} onChange={e => setHappyHour('end', e.target.value)} /></label>
          <label className="f" style={{ margin: 0, flex: '1 1 110px' }}><span>Discount %</span>
            <input type="number" min="0" max="100" value={happyHour.discountPercent || 0} onChange={e => setHappyHour('discountPercent', Number(e.target.value) || 0)} /></label>
        </div>
        <p className="hint" style={{ margin: '10px 0 0' }}>Is time window me food + play par ye discount auto lagega, member discount ke sath stack hoga.</p>
      </div></div>

      <div className="card"><div className="hd"><h2>Tables</h2><div className="spacer"></div><span className="hint">{tables.length} tables</span></div>
        <div className="bd">
          {tables.map((t, i) => (
            <div className="row" key={t.id} style={{ marginBottom: 8 }}>
              <input type="text" value={t.name} placeholder="Table name" style={{ flex: '2 1 130px' }} onChange={e => updateTable(i, 'name', e.target.value)} />
              <input type="number" value={t.capacity} placeholder="Seats" style={{ flex: '1 1 90px' }} onChange={e => updateTable(i, 'capacity', e.target.value)} />
              <button className="btn sm danger" style={{ flex: '0 0 auto' }} onClick={() => delTable(i)}>✕</button>
            </div>
          ))}
          <button className="btn sm" style={{ marginTop: 10 }} onClick={addTable}>+ Add table</button>
          <p className="hint" style={{ margin: '10px 0 0' }}>Ye tables "Tables" tab me dikhenge — jab koi group aaye, staff yahi se table open karega.</p>
        </div>
      </div>

      <div className="card"><div className="hd"><h2>Play area rates</h2></div><div className="bd">
        {form.playSlabs.map((s, i) => (
          <div className="row" key={s.id} style={{ marginBottom: 8 }}>
            <input type="text" value={s.label} placeholder="Label" onChange={e => updateSlab(i, 'label', e.target.value)} />
            <input type="number" value={s.minutes} placeholder="Min" onChange={e => updateSlab(i, 'minutes', e.target.value)} />
            <input type="number" value={s.price} placeholder="₹" onChange={e => updateSlab(i, 'price', e.target.value)} />
            <button className="btn sm danger" style={{ flex: '0 0 auto' }} onClick={() => delSlab(i)}>✕</button>
          </div>
        ))}
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn sm" style={{ flex: '0 0 auto' }} onClick={addSlab}>+ Add slab</button>
          <label className="f" style={{ margin: 0, flex: '1 1 150px' }}><span>Extra har 30 min</span>
            <input type="number" value={form.extraHalfHour} onChange={e => setField('extraHalfHour', Number(e.target.value) || 0)} /></label>
          <label className="f" style={{ margin: 0, flex: '1 1 130px' }}><span>Socks rate</span>
            <input type="number" value={form.sockPrice} onChange={e => setField('sockPrice', Number(e.target.value) || 0)} /></label>
        </div>
        <p className="hint" style={{ margin: '10px 0 0' }}>Rate per kid hai. Slab se zyada time hone par sabse badi slab + extra 30-min charge lagega.</p>
      </div></div>

      <div className="card"><div className="hd"><h2>Food menu</h2><div className="spacer"></div><span className="hint">{form.menu.length} items</span></div>
        <div className="bd">
          <datalist id="menucats">{menuCats.map(c => <option key={c} value={c} />)}</datalist>
          {form.menu.map((m, i) => (
            <div className="row" key={m.id} style={{ marginBottom: 8, alignItems: 'center' }}>
              <input type="text" value={m.name} style={{ flex: '3 1 170px' }} onChange={e => updateMenu(i, 'name', e.target.value)} />
              <input type="text" value={m.category || ''} placeholder="Category" list="menucats" style={{ flex: '2 1 110px' }} onChange={e => updateMenu(i, 'category', e.target.value)} />
              <input type="number" value={m.price} style={{ flex: '1 1 80px' }} onChange={e => updateMenu(i, 'price', e.target.value)} />
              <label style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={m.available !== false} onChange={e => setMenuAvailable(i, e.target.checked)} style={{ width: 16, height: 16 }} />
                Available
              </label>
              <button className="btn sm danger" style={{ flex: '0 0 auto' }} onClick={() => delMenu(i)}>✕</button>
            </div>
          ))}
          <button className="btn sm" style={{ marginTop: 10 }} onClick={addMenu}>+ Add item</button>
          <p className="hint" style={{ margin: '10px 0 0' }}>Category (e.g. Snacks, Drinks, Meals) se billing me items jaldi milte hain. Kitchen login bhi items ko "khatam" mark kar sakta hai.</p>
        </div>
      </div>

      <div className="card"><div className="hd"><h2>Membership plans</h2></div><div className="bd">
        {form.plans.map((p, i) => (
          <div className="row" key={p.id} style={{ marginBottom: 8 }}>
            <input type="text" value={p.name} style={{ flex: '3 1 150px' }} onChange={e => updatePlan(i, 'name', e.target.value)} />
            <input type="number" value={p.price} placeholder="₹" onChange={e => updatePlan(i, 'price', e.target.value)} />
            <input type="number" value={p.hours} placeholder="hrs" onChange={e => updatePlan(i, 'hours', e.target.value)} />
            <input type="number" value={p.days} placeholder="days" onChange={e => updatePlan(i, 'days', e.target.value)} />
            <input type="number" min="0" max="100" value={p.discountPercent || 0} placeholder="disc %" style={{ flex: '1 1 80px' }} onChange={e => updatePlan(i, 'discountPercent', e.target.value)} />
            <button className="btn sm danger" style={{ flex: '0 0 auto' }} onClick={() => delPlan(i)}>✕</button>
          </div>
        ))}
        <button className="btn sm" style={{ marginTop: 10 }} onClick={addPlan}>+ Add plan</button>
        <p className="hint" style={{ margin: '10px 0 0' }}>Hours = 0 rakhein to unlimited plan ban jayega. Disc % = 0 rakhein toh Shop card wala default member discount lagega.</p>
      </div></div>

      <div className="card"><div className="hd"><h2>Loyalty points</h2></div><div className="bd">
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <input type="checkbox" checked={!!loyalty.enabled} onChange={e => setLoyalty('enabled', e.target.checked)} style={{ width: 18, height: 18 }} />
          <span>Loyalty points on hai</span>
        </label>
        <div className="row">
          <label className="f" style={{ margin: 0, flex: '1 1 150px' }}><span>Har kitne ₹ ke bill par 1 point</span>
            <input type="number" min="1" value={loyalty.earnPer || 100} onChange={e => setLoyalty('earnPer', Number(e.target.value) || 100)} /></label>
          <label className="f" style={{ margin: 0, flex: '1 1 150px' }}><span>1 point = kitne ₹</span>
            <input type="number" min="0" step="0.5" value={loyalty.pointValue ?? 1} onChange={e => setLoyalty('pointValue', Number(e.target.value) || 0)} /></label>
        </div>
        <p className="hint" style={{ margin: '10px 0 0' }}>
          Example: ₹{loyalty.earnPer || 100} par 1 point, 1 point = ₹{loyalty.pointValue ?? 1} → ₹1000 ke bill par {Math.floor(1000 / (loyalty.earnPer || 100))} points
          (agli baar ₹{Math.floor(1000 / (loyalty.earnPer || 100)) * (loyalty.pointValue ?? 1)} off). Sirf phone number wale customers ko milte hain; bill par "points use karein" tick karke redeem hote hain.
        </p>
      </div></div>

      <div className="card"><div className="hd"><h2>QR se table order</h2></div><div className="bd">
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <input type="checkbox" checked={form.qrOrdering !== false} onChange={e => setField('qrOrdering', e.target.checked)} style={{ width: 18, height: 18 }} />
          <span>Customer QR scan karke order bhej sakte hain</span>
        </label>
        <p className="hint" style={{ margin: '0 0 12px' }}>
          Har table ka alag QR sticker print karke table par lagaiye. Customer ka order seedha kitchen nahi jaata — staff ki table screen par "📱 Naya QR order" aata hai, staff Accept kare tab bill me judta hai. Order sirf tab jaata hai jab table open ho.
        </p>
        <button className="btn dark" disabled={!tables.some(t => t.qrToken)} onClick={() => printTableQRs(tables, form.shopName || 'Funny Mouse')}>Sab tables ke QR print karein</button>
        {tables.some(t => !t.qrToken) && <p className="hint" style={{ margin: '10px 0 0' }}>Naye tables ka QR banne ke liye pehle neeche "Save settings" dabaiye.</p>}
      </div></div>

      <BackupCard />

      <UsersCard />

      <div className="card"><div className="bd">
        <button className="btn primary" style={{ width: '100%', padding: 14 }} disabled={saving} onClick={saveAll}>{saving ? 'Saving…' : 'Save settings'}</button>
        <p className="hint" style={{ margin: '10px 0 0', textAlign: 'center' }}>Data MongoDB me save hota hai — har device/login par same.</p>
      </div></div>
    </>
  );
}
