export function Avatar({ name, size = 36 }: { name: string | null | undefined; size?: number }) {
  const safeName = name || '?';
  const initials = safeName.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase();
  const hue = safeName.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div className="avatar" style={{
      width: size, height: size,
      background: `hsl(${hue},35%,20%)`, border: `1.5px solid hsl(${hue},35%,30%)`,
      fontSize: size * 0.33, color: `hsl(${hue},60%,70%)`,
    }}>{initials}</div>
  );
}
