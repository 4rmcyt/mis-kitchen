import { supabase, q, getCurrentProfile } from './client.js';

export async function getShifts(weekStart) {
  const profile = await getCurrentProfile();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return q(() =>
    supabase.from('shifts')
      .select('*, profiles(id, name, station)')
      .eq('restaurant_id', profile.restaurant_id)
      .gte('date', weekStart)
      .lte('date', weekEnd.toISOString().split('T')[0])
      .order('date')
  );
}

export async function createShift({ userId, date, station, startTime, endTime }) {
  const profile = await getCurrentProfile();
  return q(() =>
    supabase.from('shifts').insert({
      restaurant_id: profile.restaurant_id,
      user_id:    userId || null,
      date,
      station:    station || null,
      start_time: startTime || null,
      end_time:   endTime || null,
    }).select('*, profiles(id, name, station)').single()
  );
}

export async function deleteShift(id) {
  return q(() => supabase.from('shifts').delete().eq('id', id));
}

export async function getTodayShifts() {
  const profile = await getCurrentProfile();
  const today = new Date().toISOString().split('T')[0];
  return q(() =>
    supabase.from('shifts')
      .select('*, profiles(id, name, station)')
      .eq('restaurant_id', profile.restaurant_id)
      .eq('date', today)
      .order('start_time')
  );
}
