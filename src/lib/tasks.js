import { supabase, q, getCurrentProfile } from './client.js';

export async function getTasks(date) {
  return q(() =>
    supabase.from("tasks").select("*, profiles!done_by(name)").eq("date", date).order("section").order("created_at")
  );
}

export async function createTask({ text, station, section, date, source = "manual", template_id = null }) {
  const profile = await getCurrentProfile();
  return q(() =>
    supabase.from("tasks").insert({
      text, station, section, date, source, template_id,
      created_by:    profile.id,
      restaurant_id: profile.restaurant_id,
    }).select().single()
  );
}

export async function createTasksBatch(tasks) {
  const profile = await getCurrentProfile();
  const rows = tasks.map(t => ({
    ...t,
    created_by:    profile.id,
    restaurant_id: profile.restaurant_id,
  }));
  return q(() => supabase.from("tasks").insert(rows).select());
}

export async function updateTask(id, updates) {
  return q(() =>
    supabase.from("tasks").update(updates).eq("id", id).select().single()
  );
}

export async function deleteTask(id) {
  return q(() => supabase.from("tasks").delete().eq("id", id));
}

export async function completeTask(id) {
  const { data: { user } } = await supabase.auth.getUser();
  return q(() =>
    supabase.from("tasks").update({ done: true, done_at: new Date().toISOString(), done_by: user.id }).eq("id", id).select().single()
  );
}

export async function uncompleteTask(id) {
  return q(() =>
    supabase.from("tasks").update({ done: false, done_at: null, done_by: null }).eq("id", id).select().single()
  );
}

export async function commentTask(id, comment) {
  return q(() =>
    supabase.from("tasks").update({ comment }).eq("id", id).select().single()
  );
}

export async function getDeferredTasks() {
  return q(() =>
    supabase.from("deferred_tasks").select("*").eq("carried", false).order("created_at")
  );
}

export async function deferTask({ text, station, deferred_from }) {
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
    console.error("[tasks] defer:", err.message);
    throw err;
  }
}

export async function markTaskCarried(id) {
  return q(() =>
    supabase.from("deferred_tasks").update({ carried: true }).eq("id", id)
  );
}

export async function deleteDeferred(id) {
  return q(() => supabase.from("deferred_tasks").delete().eq("id", id));
}
