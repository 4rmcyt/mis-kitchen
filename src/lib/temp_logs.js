import { supabase, q, getCurrentProfile } from './client.js';

export async function getTempLogs(date) {
  const start = `${date}T00:00:00+00:00`;
  const end   = `${date}T23:59:59+00:00`;
  return q(() =>
    supabase.from('temp_logs')
      .select('*, profiles(name)')
      .gte('recorded_at', start)
      .lte('recorded_at', end)
      .order('recorded_at', { ascending: false })
  );
}

export async function logTemperature(station, temperature) {
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
