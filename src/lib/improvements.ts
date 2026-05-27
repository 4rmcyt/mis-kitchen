import { supabase, q, getCurrentProfile } from './client.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getImprovementLogs(limit = 10): Promise<any[]> {
  const profile = await getCurrentProfile();
  return q(() =>
    supabase.from('improvement_logs')
      .select('id, text, created_at, profiles(name)')
      .eq('restaurant_id', profile.restaurant_id)
      .order('created_at', { ascending: false })
      .limit(limit)
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function addImprovementLog(text: string): Promise<any> {
  const profile = await getCurrentProfile();
  return q(() =>
    supabase.from('improvement_logs').insert({
      restaurant_id: profile.restaurant_id,
      author_id:     profile.id,
      text:          text.trim(),
    }).select('id, text, created_at, profiles(name)').single()
  );
}

export async function deleteImprovementLog(id: string): Promise<null> {
  return q(() =>
    supabase.from('improvement_logs').delete().eq('id', id)
  );
}
