import { supabase, q, getCurrentProfile } from './client.js';

export async function getTemplates() {
  return q(() =>
    supabase.from("templates").select("*").order("created_at", { ascending: false })
  );
}

export async function createTemplate(template) {
  try {
    const profile = await getCurrentProfile();
    return q(() =>
      supabase.from("templates").insert({
        ...template,
        created_by:    profile.id,
        restaurant_id: profile.restaurant_id,
      }).select().single()
    );
  } catch (err) {
    console.error("[templates] create:", err.message);
    throw err;
  }
}

export async function updateTemplate(id, updates) {
  return q(() =>
    supabase.from("templates").update(updates).eq("id", id).select().single()
  );
}

export async function deleteTemplate(id) {
  return q(() => supabase.from("templates").delete().eq("id", id));
}

export async function getDefaultDayTemplate() {
  return q(() =>
    supabase.from("day_templates").select("*").eq("is_default", true).maybeSingle()
  );
}

export async function getDayTemplates() {
  return q(() =>
    supabase.from("day_templates").select("*").order("created_at", { ascending: false })
  );
}

export async function createDayTemplate({ name, entries }) {
  const profile = await getCurrentProfile();
  return q(() =>
    supabase.from("day_templates").insert({
      name, entries,
      created_by:    profile.id,
      restaurant_id: profile.restaurant_id,
    }).select().single()
  );
}

export async function updateDayTemplate(id, updates) {
  return q(() =>
    supabase.from("day_templates").update(updates).eq("id", id).select().single()
  );
}

export async function deleteDayTemplate(id) {
  return q(() => supabase.from("day_templates").delete().eq("id", id));
}
