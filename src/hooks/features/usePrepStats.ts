import { useState, useEffect } from 'react';
import { getPrepStats } from '../../lib/prep_stats.js';
import { groupByPerson, groupByPrepItem, type ByPersonEntry, type ByPrepEntry } from '../../domain/prep_stats.js';

export type Period = 'week' | 'month';

function periodRange(period: Period): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  if (period === 'week') {
    start.setDate(start.getDate() - 6);
  } else {
    start.setDate(1);
  }
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

export interface PrepStatsData {
  byPerson: ByPersonEntry[];
  byPrep:   ByPrepEntry[];
}

export function usePrepStats(period: Period) {
  const [data, setData]       = useState<PrepStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const { start, end } = periodRange(period);
    getPrepStats(start, end)
      .then(rows => {
        if (cancelled) return;
        setData({ byPerson: groupByPerson(rows), byPrep: groupByPrepItem(rows) });
      })
      .catch(e => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [period]);

  return { data, loading, error };
}
