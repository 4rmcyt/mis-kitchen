export function Badge({ color, children, small }) {
  return (
    <span
      className={`badge ${small ? 'badge--sm' : 'badge--md'}`}
      style={{ background: `${color}22`, borderColor: `${color}44`, color }}
    >{children}</span>
  );
}
