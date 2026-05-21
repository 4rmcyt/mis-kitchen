export function Badge({ color, children, small }) {
  return (
    <span style={{
      background: color + '22', border: `1px solid ${color}44`,
      color, borderRadius: 4, padding: small ? '1px 6px' : '3px 8px',
      fontSize: small ? 10 : 11, fontWeight: 600,
      fontFamily: 'var(--font-display)', letterSpacing: '0.3px',
      whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}
