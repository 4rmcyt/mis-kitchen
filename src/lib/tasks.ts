import { supabase, q, getCurrentProfile } from './client.js';
import type { Task, DeferredTask, Station } from './types.js';

export async function getTasks(date: string): Promise<Task[]> {
  return q(() =>
    supabase.from("tasks").select("*, profiles!done_by(name)").eq("date", date).order("section").order("created_at")
  );
}

export async function createTask({ text, station, section, date, source = "manual", template_id = null }: {
  text: string; station: Station; section: string; date: string; source?: string; template_id?: string | null;
}): Promise<Task> {
  const profile = await getCurrentProfile();
  return q(() =>
    supabase.from("tasks").insert({
      text, station, section, date, source, template_id,
      created_by:    profile.id,
      restaurant_id: profile.restaurant_id,
    }).select().single()
  );
}

export async function createTasksBatch(tasks: Array<{ text: string; station: Station; section: string; date: string; source?: string; template_id?: string | null }>): Promise<Task[]> {
  const profile = await getCurrentProfile();
  const rows = tasks.map(t => ({
    ...t,
    created_by:    profile.id,
    restaurant_id: profile.restaurant_id,
  }));
  return q(() => supabase.from("tasks").insert(rows).select());
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  return q(() =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase.from("tasks").update(updates as any).eq("id", id).select().single()
  );
}

export async function deleteTask(id: string): Promise<null> {
  return q(() => supabase.from("tasks").delete().eq("id", id));
}

export async function completeTask(id: string): Promise<Task> {
  const profile = await getCurrentProfile();
  return q(() =>
    supabase.from("tasks").update({ done: true, done_at: new Date().toISOString(), done_by: profile.id }).eq("id", id).select().single()
  );
}

export async function uncompleteTask(id: string): Promise<Task> {
  return q(() =>
    supabase.from("tasks").update({ done: false, done_at: null, done_by: null }).eq("id", id).select().single()
  );
}

export async function commentTask(id: string, comment: string): Promise<Task> {
  return q(() =>
    supabase.from("tasks").update({ comment }).eq("id", id).select().single()
  );
}

export async function getDeferredTasks(): Promise<DeferredTask[]> {
  return q(() =>
    supabase.from("deferred_tasks").select("*").eq("carried", false).order("created_at")
  );
}

export async function deferTask({ text, station, deferred_from }: { text: string; station: Station; deferred_from: string }): Promise<DeferredTask> {
  try {
    const profile = await getCurrentProfile();
    return q(() =>
      supabase.from("deferred_tasks").insert({
        user_id:       profile.id,
        restaurant_id: profile.restaurant_id,
        text, station, deferred_from,
      }).select().single()
    );
  } catch (err) {
    console.error("[tasks] defer:", (err as Error).message);
    throw err;
  }
}

export async function markTaskCarried(id: string): Promise<null> {
  return q(() =>
    supabase.from("deferred_tasks").update({ carried: true }).eq("id", id)
  );
}

export async function deleteDeferred(id: string): Promise<null> {
  return q(() => supabase.from("deferred_tasks").delete().eq("id", id));
}
