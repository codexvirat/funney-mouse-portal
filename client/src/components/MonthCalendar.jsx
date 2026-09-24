import { addMonths, dstr } from '../utils/date';

// Month grid (Mon–Sun). `month` is "YYYY-MM"; renderMark(date) returns what
// to show under a day's number (or null); days with a mark get highlighted.
export default function MonthCalendar({ month, onMonth, selected, onSelect, renderMark }) {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const daysIn = new Date(y, m, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysIn }, (_, i) => month + '-' + String(i + 1).padStart(2, '0'))];
  const today = dstr();
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <button className="btn sm ghost" aria-label="Pichla mahina" onClick={() => onMonth(addMonths(month + '-01', -1).slice(0, 7))}>‹</button>
        <b style={{ flex: 1, textAlign: 'center' }}>{first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</b>
        <button className="btn sm ghost" aria-label="Agla mahina" onClick={() => onMonth(addMonths(month + '-01', 1).slice(0, 7))}>›</button>
      </div>
      <div className="cal">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => <span key={d} className="hint">{d}</span>)}
        {cells.map((d, ix) => {
          if (!d) return <span key={'x' + ix} />;
          const mark = renderMark(d);
          return (
            <button key={d} className={'cald' + (mark ? ' has' : '') + (d === today ? ' today' : '')} aria-pressed={selected === d}
              onClick={() => onSelect(selected === d ? null : d)}>
              {Number(d.slice(8))}
              {mark}
            </button>
          );
        })}
      </div>
    </div>
  );
}
