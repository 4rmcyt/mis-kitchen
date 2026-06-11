/**
 * Build UTC start/end boundaries for a local calendar day in the given timezone.
 * Uses Intl to derive the UTC offset at noon of that day — DST-safe (noon is never
 * in a DST gap or fold, unlike midnight).
 *
 * @param localDate - ISO date string "YYYY-MM-DD" in the target timezone
 * @param tz        - IANA timezone identifier, e.g. "America/Edmonton"
 * @returns ISO 8601 UTC strings for the inclusive [start, end] of the local day
 */
export function localDayUtcBounds(localDate: string, tz: string): { start: string; end: string } {
  const [year, month, day] = localDate.split('-').map(Number);

  const midnightUtcCandidate = Date.UTC(year, month - 1, day, 0, 0, 0);

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });

  // Measure offset at noon to avoid DST-gap ambiguity at midnight.
  const noonUtcCandidate = Date.UTC(year, month - 1, day, 12, 0, 0);
  const parts = formatter.formatToParts(noonUtcCandidate);
  const p = Object.fromEntries(
    parts.filter(x => x.type !== 'literal').map(x => [x.type, x.value])
  );
  const localNoon = Date.UTC(
    Number(p.year), Number(p.month) - 1, Number(p.day),
    Number(p.hour), Number(p.minute), Number(p.second)
  );
  // offsetMs is positive when local time is behind UTC (e.g. MDT = UTC-6 → +6h)
  const offsetMs = noonUtcCandidate - localNoon;

  const startMs = midnightUtcCandidate + offsetMs;
  const endMs   = midnightUtcCandidate + offsetMs + (24 * 60 * 60 * 1000 - 1);

  return {
    start: new Date(startMs).toISOString(),
    end:   new Date(endMs).toISOString(),
  };
}
