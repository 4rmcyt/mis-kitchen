import { supabase, q, getCurrentProfile } from './client.js';
import { RESTAURANT_TIMEZONE } from './constants.js';
import type { TempLog, Station } from './types.js';

// Build UTC start/end boundaries for a local calendar day in the restaurant's timezone.
// Uses Intl to derive the UTC offset at that specific date (DST-aware).
function localDayUtcBounds(localDate: string, tz: string): { start: string; end: string } {
  const [year, month, day] = localDate.split('-').map(Number);

  // Construct a Date that represents midnight in the target tz.
  // Simpler approach: treat the date string as if it were local, then apply
  // the tz offset that Intl reports at that moment.
  const midnightUtcCandidate = Date.UTC(year, month - 1, day, 0, 0, 0);

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });

  // Find the UTC offset at noon local time to avoid DST-gap ambiguity at midnight.
  const noonUtcCandidate = Date.UTC(year, month - 1, day, 12, 0, 0);
  const parts = formatter.formatToParts(noonUtcCandidate);
  const p = Object.fromEntries(parts.filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
  const localNoon = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
  const offsetMs = noonUtcCandidate - localNoon; // positive = behind UTC (e.g. MDT = +6h)

  const startMs = midnightUtcCandidate + offsetMs;
  const endMs   = midnightUtcCandidate + offsetMs + (24 * 60 * 60 * 1000 - 1);

  return {
    start: new Date(startMs).toISOString(),
    end:   new Date(endMs).toISOString(),
  };
}

export async function getTempLogs(date: string): Promise<TempLog[]> {
  const { start, end } = localDayUtcBounds(date, RESTAURANT_TIMEZONE);
  return q(() =>
    supabase.from('temp_logs')
      .select('*, profiles(name)')
      .gte('recorded_at', start)
      .lte('recorded_at', end)
      .order('recorded_at', { ascending: false })
  );
}

export async function logTemperature(station: Station, temperature: number): Promise<TempLog> {
  const profile = await getCurrentProfile();
  return q(() =>
    supabase.from('temp_logs').insert({
      station,
      temperature,
      user_id:       profile.id,
      restaurant_id: profile.restaurant_id,
    }).select().single()
  );
}
