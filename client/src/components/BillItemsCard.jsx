import { INR } from '../utils/money';

// onNote (tables only): lets staff add a kitchen note like "less spicy" to a
// food line. points/redeemPoints/setRedeemPoints: loyalty redemption, shown
// when the customer has points and loyalty is on.
export default function BillItemsCard({ items, removeItem, discount, setDiscount, discountType, setDiscountType, canDiscount, sub, disc, total, autoDiscount, onNote, points, pointValue, redeemPoints, setRedeemPoints }) {
  if (!items.length) {
    return <div className="empty"><b>Bill khaali hai</b>Upar se play, food ya socks add kijiye.</div>;
  }
  return (
    <>
      <ul className="items">
        {items.map(i => (
          <li key={i.id}>
            <span className={'dot d-' + i.cat}></span>
            <span className="nm">
              <b>{i.name}</b>
              <small>{i.cat === 'play'
                ? `${i.meta.minutes} min × ${i.meta.kids} kid${i.meta.kids > 1 ? 's' : ''}${i.meta.member ? ' · membership' : ' · ' + INR(i.rate) + '/kid'}`
                : `${i.qty} × ${INR(i.rate)}`}</small>
              {i.meta && i.meta.note && <small style={{ color: 'var(--berry)' }}>» {i.meta.note}</small>}
            </span>
            {onNote && i.cat === 'food' && (
              <button className="btn sm ghost" aria-label="Kitchen note" onClick={() => onNote(i)}>Note</button>
            )}
            <span className="amt">{INR(i.amount)}</span>
            <button className="btn sm ghost" aria-label="Remove" onClick={() => removeItem(i.id)}>✕</button>
          </li>
        ))}
      </ul>

      {canDiscount && (
        <div className="row" style={{ marginTop: 14, alignItems: 'flex-end' }}>
          <label className="f" style={{ margin: 0, flex: '1 1 120px' }}><span>Discount</span>
            <input type="number" min="0" value={discount || ''} placeholder="0" onChange={e => setDiscount(Number(e.target.value) || 0)} />
          </label>
          <div style={{ flex: '0 0 130px' }}>
            <div className="seg">
              <button aria-pressed={discountType === 'amt'} onClick={() => setDiscountType('amt')}>₹</button>
              <button aria-pressed={discountType === 'pct'} onClick={() => setDiscountType('pct')}>%</button>
            </div>
          </div>
        </div>
      )}

      {setRedeemPoints && points > 0 && (
        <label style={{ display: 'flex', gap: 9, alignItems: 'center', marginTop: 14, fontSize: 14 }}>
          <input type="checkbox" checked={redeemPoints > 0} onChange={e => setRedeemPoints(e.target.checked ? points : 0)} style={{ width: 18, height: 18 }} />
          {points} loyalty points use karein (max {INR(points * (pointValue || 1))} off)
        </label>
      )}

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)', display: 'grid', gap: 6, fontSize: '14.5px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="hint">Subtotal</span><b className="num">{INR(sub)}</b></div>
        {disc > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--berry)' }}><span>Discount</span><b className="num">− {INR(disc)}</b></div>}
        {autoDiscount && autoDiscount.memberDiscount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--grape)' }}><span>Member discount</span><b className="num">− {INR(autoDiscount.memberDiscount)}</b></div>
        )}
        {autoDiscount && autoDiscount.happyHourDiscount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--sky)' }}><span>Happy hour</span><b className="num">− {INR(autoDiscount.happyHourDiscount)}</b></div>
        )}
        {autoDiscount && autoDiscount.pointsDiscount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--mint)' }}><span>Loyalty points</span><b className="num">− {INR(autoDiscount.pointsDiscount)}</b></div>
        )}
        {autoDiscount && autoDiscount.cgst > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="hint">CGST</span><b className="num">{INR(autoDiscount.cgst)}</b></div>
        )}
        {autoDiscount && autoDiscount.sgst > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="hint">SGST</span><b className="num">{INR(autoDiscount.sgst)}</b></div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17 }}><b>Total</b><b className="num">{INR(total)}</b></div>
      </div>
    </>
  );
}
