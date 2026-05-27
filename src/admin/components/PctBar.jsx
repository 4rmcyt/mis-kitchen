export function PctBar({ pct, color = "#F97316", height = 4 }) {
  const c = pct >= 90 ? "#10B981" : pct >= 70 ? "#F97316" : "#EF4444";
  return (
    <div className="pct-bar" style={{ height }}>
      <div className="pct-bar__fill" style={{ width: `${pct}%`, background: color || c }}/>
    </div>
  );
}
