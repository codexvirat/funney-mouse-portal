import { INR } from '../utils/money';

// Sales minus GST (collected for the government) minus recorded expenses.
// Doesn't know food/stock cost beyond what's entered as expenses.
export default function ProfitCard({ t, expenses }) {
  if (!expenses) return null;
  const spent = expenses.reduce((a, e) => a + e.amount, 0);
  const gst = (t.cgst || 0) + (t.sgst || 0);
  const net = t.total - gst - spent;
  const byDesc = {};
  expenses.forEach(e => { const k = e.desc.trim().toLowerCase(); byDesc[k] = byDesc[k] || { name: e.desc.trim(), amount: 0 }; byDesc[k].amount += e.amount; });
  const top = Object.values(byDesc).sort((a, b) => b.amount - a.amount).slice(0, 6);
  return (
    <div className="card"><div className="hd"><h2>Kharcha aur bachat</h2></div><div className="bd">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="hint">Total sale</span><b className="num">{INR(t.total)}</b></div>
      {gst > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}><span className="hint">− GST (sarkar ka)</span><b className="num">{INR(gst)}</b></div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}><span className="hint">− Kharcha ({expenses.length})</span><b className="num">{INR(spent)}</b></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line)', fontSize: 17 }}>
        <b>Bachat</b><b className="num" style={{ color: net >= 0 ? 'var(--mint)' : 'var(--berry)' }}>{INR(net)}</b>
      </div>
      {top.length > 0 && (
        <p className="hint" style={{ margin: '10px 0 0' }}>Sabse zyada kharcha: {top.map(x => x.name + ' ' + INR(x.amount)).join(' · ')}</p>
      )}
    </div></div>
  );
}
