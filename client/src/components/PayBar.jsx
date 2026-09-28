import { INR } from '../utils/money';

export default function PayBar({ itemsCount, kids, total, onClear, onPay, onSplit }) {
  return (
    <div className="paybar">
      <div className="wrap">
        <div className="tot">
          <small>{itemsCount} {itemsCount === 1 ? 'item' : 'items'}{kids > 0 ? ' · ' + kids + ' kids' : ''}</small>
          <b>{INR(total)}</b>
        </div>
        <div className="spacer"></div>
        <button className="btn ghost sm" onClick={onClear}>Clear</button>
        {onSplit && <button className="btn sm" disabled={!itemsCount} onClick={onSplit}>Split bill</button>}
        <button className="btn primary" disabled={!itemsCount} onClick={onPay}>Take payment</button>
      </div>
    </div>
  );
}
