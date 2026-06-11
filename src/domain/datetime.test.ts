import { describe, it, expect } from 'vitest';
import { localDayUtcBounds } from './datetime.js';

const TZ = 'America/Edmonton';

describe('localDayUtcBounds', () => {
  it('winter day (MST, UTC-7): 2026-01-15', () => {
    const { start, end } = localDayUtcBounds('2026-01-15', TZ);
    expect(start).toBe('2026-01-15T07:00:00.000Z');
    expect(end).toBe('2026-01-16T06:59:59.999Z');
  });

  it('summer day (MDT, UTC-6): 2026-07-15', () => {
    const { start, end } = localDayUtcBounds('2026-07-15', TZ);
    expect(start).toBe('2026-07-15T06:00:00.000Z');
    expect(end).toBe('2026-07-16T05:59:59.999Z');
  });

  // DST spring-forward: 2026-03-08 at 02:00 MST → 03:00 MDT.
  // At noon on that day the tz is already MDT (UTC-6), so offset = +6h.
  // Local midnight (00:00 MDT) = 06:00Z.
  it('DST spring-forward day (2026-03-08): noon in MDT, start = 06:00Z', () => {
    const { start, end } = localDayUtcBounds('2026-03-08', TZ);
    expect(start).toBe('2026-03-08T06:00:00.000Z');
    expect(end).toBe('2026-03-09T05:59:59.999Z');
  });

  // DST fall-back: 2026-11-01 at 02:00 MDT → 01:00 MST.
  // At noon on that day the tz has already fallen back to MST (UTC-7), so offset = +7h.
  // Local midnight (00:00 MST) = 07:00Z.
  it('DST fall-back day (2026-11-01): noon in MST, start = 07:00Z', () => {
    const { start, end } = localDayUtcBounds('2026-11-01', TZ);
    expect(start).toBe('2026-11-01T07:00:00.000Z');
    expect(end).toBe('2026-11-02T06:59:59.999Z');
  });
});
