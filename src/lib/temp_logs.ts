import { supabase, q, getCurrentProfile } from './client.js';
import { RESTAURANT_TIMEZONE } from './constants.js';
import { localDayUtcBounds } from '../domain/datetime.js';
import type { TempLog, Station } from './types.js';

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
