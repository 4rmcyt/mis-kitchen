import { supabase, q, getCurrentProfile } from './client.js';

export async function getImprovementLogs(limit = 10) {
  const profile = await getCurrentProfile();
  return q(() =>
    supabase.from('improvement_logs')
      .select('id, text, created_at, profiles(name)')
      .eq('restaurant_id', profile.restaurant_id)
      .order('created_at', { ascending: false })
      .limit(limit)
  );
}

export async function addImprovementLog(text) {
  const profile = await getCurrentProfile();
  return q(() =>
    supabase.from('improvement_logs').insert({
      restaurant_id: profile.restaurant_id,
      author_id:     profile.id,
      text:          text.trim(),
    }).select('id, text, created_at, profiles(name)').single()
  );
}

export async function deleteImprovementLog(id) {
  return q(() =>
    supabase.from('improvement_logs').delete().eq('id', id)
  );
}
