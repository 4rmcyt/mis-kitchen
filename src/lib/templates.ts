import { supabase, q, getCurrentProfile } from './client.js';
import type { Template } from './types.js';

export async function getTemplates(): Promise<Template[]> {
  return q<Template[]>(() =>
    supabase.from("templates").select("*").order("created_at", { ascending: false })
  );
}

export async function createTemplate(template: Partial<Template>): Promise<Template> {
  try {
    const profile = await getCurrentProfile();
    return q<Template>(() =>
      supabase.from("templates").insert({
        ...template as object,
        created_by:    profile.id,
        restaurant_id: profile.restaurant_id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any).select().single()
    );
  } catch (err) {
    console.error("[templates] create:", (err as Error).message);
    throw err;
  }
}

export async function updateTemplate(id: string, updates: Partial<Template>): Promise<Template> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return q<Template>(() => supabase.from("templates").update(updates as any).eq("id", id).select().single());
}

export async function deleteTemplate(id: string): Promise<null> {
  return q(() => supabase.from("templates").delete().eq("id", id));
}

export async function getDefaultDayTemplate(): Promise<Template | null> {
  return q<Template | null>(() =>
    supabase.from("day_templates").select("*").eq("is_default", true).maybeSingle()
  );
}

export async function getDayTemplates(): Promise<Template[]> {
  return q<Template[]>(() =>
    supabase.from("day_templates").select("*").order("created_at", { ascending: false })
  );
}

export async function createDayTemplate({ name, entries }: { name: string; entries: Template['entries'] }): Promise<Template> {
  const profile = await getCurrentProfile();
  return q<Template>(() =>
    supabase.from("day_templates").insert({
      name, entries: entries as unknown as import('./database.types.js').Json,
      created_by:    profile.id,
      restaurant_id: profile.restaurant_id,
    }).select().single()
  );
}

export async function updateDayTemplate(id: string, updates: Partial<Template>): Promise<Template> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return q<Template>(() => supabase.from("day_templates").update(updates as any).eq("id", id).select().single());
}

export async function deleteDayTemplate(id: string): Promise<null> {
  return q(() => supabase.from("day_templates").delete().eq("id", id));
}
