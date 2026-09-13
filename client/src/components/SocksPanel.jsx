import { useState } from 'react';
import { INR } from '../utils/money';

export default function SocksPanel({ config, sockQty, setSockQty, onAdd, toast }) {
  const [rate, setRate] = useState(config.sockPrice);
  const bump = (d) => setSockQty(q => Math.max(1, Math.min(30, q + d)));

  const add = () => {
    const r = Number(rate) || 0;
    onAdd({ cat: 'socks', name: 'Socks', qty: sockQty, rate: r, amount: r * sockQty });
    setSockQty(1);
    toast('Socks added');
  };

  return (
    <div className="row" style={{ alignItems: 'flex-end' }}>
      <div style={{ flex: '0 0 auto' }}>
        <span className="hint" style={{ display: 'block', marginBottom: 5 }}>Pairs</span>
        <div className="stepper"><button onClick={() => bump(-1)}>−</button><b>{sockQty}</b><button onClick={() => bump(1)}>+</button></div>
      </div>
      <label className="f" style={{ margin: 0, flex: '1 1 130px' }}><span>Rate per pair</span>
        <input type="number" value={rate} onChange={e => setRate(e.target.value)} />
      </label>
      <button className="btn dark" style={{ flex: '1 1 160px' }} onClick={add}>Add socks · {INR(sockQty * (Number(rate) || 0))}</button>
    </div>
  );
}
