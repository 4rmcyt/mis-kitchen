export function Avatar({ name, size = 36 }) {
  const safeName = name || '?';
  const initials = safeName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  const hue = safeName.split('').reduce((a,c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `hsl(${hue},35%,20%)`, border: `1.5px solid hsl(${hue},35%,30%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.33, fontWeight: 600, color: `hsl(${hue},60%,70%)`,
      flexShrink: 0, fontFamily: 'var(--font-display)',
    }}>{initials}</div>
  );
}
