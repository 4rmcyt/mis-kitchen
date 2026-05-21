export function PctBar({ pct, color = "#F97316", height = 4 }) {
  const c = pct >= 90 ? "#10B981" : pct >= 70 ? "#F97316" : "#EF4444";
  return (
    <div style={{ background: '#1a1a1a', borderRadius: 2, height, overflow: 'hidden', flex: 1 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color || c, borderRadius: 2, transition: 'width 0.4s' }}/>
    </div>
  );
}
