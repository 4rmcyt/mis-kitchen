import { ReactNode } from 'react';

export function Badge({ color, children, small }: { color: string; children: ReactNode; small?: boolean }) {
  return (
    <span
      className={`badge ${small ? 'badge--sm' : 'badge--md'}`}
      style={{ background: `${color}22`, borderColor: `${color}44`, color }}
    >{children}</span>
  );
}
