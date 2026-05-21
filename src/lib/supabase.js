// src/lib/supabase.js
// Single Supabase client. Import everywhere — never create a second instance.
// .env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { detectSessionInUrl: true, flowType: 'implicit' } }
);

// ── Error wrapper ─────────────────────────────────────────────
// Every Supabase call goes through this — throws with a clean message
async function q(fn) {
  try {
    const { data, error } = await fn();
    if (error) throw new Error(error.message);
    return data;
  } catch (err) {
    console.error("[supabase]", err.message);
    throw err;
  }
}

// ── AUTH ─────────────────────────────────────────────────────

export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
  } catch (err) {
    console.error("[auth] signIn:", err.message);
    throw err;
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error("[auth] signOut:", err.message);
    throw err;
  }
}

export async function getSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    return session;
  } catch (err) {
    console.error("[auth] getSession:", err.message);
    return null;
  }
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => callback(session, event));
}

// ── CURRENT USER HELPER ───────────────────────────────────────
async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  return user;
}

async function getCurrentProfile() {
  const user = await getCurrentUser();
  return q(() => supabase.from("profiles").select("*").eq("id", user.id).single());
}

// ── PROFILES ──────────────────────────────────────────────────

export async function getProfile(userId) {
  return q(() => supabase.from("profiles").select("*").eq("id", userId).single());
}

export async function updateProfile(userId, updates) {
  const allowed = {
    ...(updates.name     !== undefined && { name:         updates.name }),
    ...(updates.station  !== undefined && { station:      updates.station }),
    ...(updates.password_set !== undefined && { password_set: updates.password_set }),
  };
  return q(() =>
    supabase.from("profiles").update(allowed).eq("id", userId).select().single()
  );
}

export async function getRestaurantProfiles() {
  return q(() => supabase.from("profiles").select("*").order("name"));
}

export async function adminUpdateProfile(userId, updates) {
  const allowed = {
    ...(updates.role    !== undefined && { role:    updates.role }),
    ...(updates.station !== undefined && { station: updates.station }),
    ...(updates.active  !== undefined && { active:  updates.active }),
  };
  return q(() =>
    supabase.from("profiles").update(allowed).eq("id", userId).select().single()
  );
}

// ── INVITES ──────────────────────────────────────────────────

export async function createInvite({ email, role, station }) {
  try {
    const profile = await getCurrentProfile();
    const invite = await q(() =>
      supabase.from("invites").insert({
        email, role, station,
        restaurant_id: profile.restaurant_id,
        invited_by:    profile.id,
      }).select().single()
    );
    // Send invite email via Edge Function
    const { error } = await supabase.functions.invoke("send-invite", {
      body: { invite_id: invite.id }
    });
    if (error) console.warn("[invites] email send failed:", error.message);
    return invite;
  } catch (err) {
    console.error("[invites] createInvite:", err.message);
    throw err;
  }
}

export async function getInvites() {
  return q(() =>
    supabase.from("invites").select("*").order("created_at", { ascending: false })
  );
}

// ── TEMPLATES ─────────────────────────────────────────────────

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

// ── RECIPES ───────────────────────────────────────────────────

export async function getRecipes() {
  return q(() => supabase.from("recipes").select("*").order("name"));
}

export async function createRecipe(recipe) {
  try {
    const profile = await getCurrentProfile();
    return q(() =>
      supabase.from("recipes").insert({
        ...recipe,
        created_by:    profile.id,
        restaurant_id: profile.restaurant_id,
      }).select().single()
    );
  } catch (err) {
    console.error("[recipes] create:", err.message);
    throw err;
  }
}

export async function updateRecipe(id, updates) {
  return q(() =>
    supabase.from("recipes").update(updates).eq("id", id).select().single()
  );
}

export async function deleteRecipe(id) {
  return q(() => supabase.from("recipes").delete().eq("id", id));
}

// ── DAY TEMPLATES ─────────────────────────────────────────────

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
      created_by: profile.id,
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

// ── TASKS ──────────────────────────────────────────────────────

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
      created_by: profile.id,
      restaurant_id: profile.restaurant_id,
    }).select().single()
  );
}

export async function createTasksBatch(tasks) {
  const profile = await getCurrentProfile();
  const rows = tasks.map(t => ({
    ...t,
    created_by: profile.id,
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

// ── DAILY REPORTS ─────────────────────────────────────────────

export async function saveReport({ sections, nextShift }) {
  try {
    const profile = await getCurrentProfile();
    const allItems = sections.flatMap(s => s.items);
    const completed_count = allItems.filter(i => i.done).length;
    const total_count     = allItems.length;
    const completed_pct   = total_count > 0
      ? Math.round((completed_count / total_count) * 100) : 0;

    return q(() =>
      supabase.from("daily_reports").upsert({
        user_id:       profile.id,
        restaurant_id: profile.restaurant_id,
        date:          new Date().toISOString().split("T")[0],
        sections,
        next_shift:    nextShift,
        completed_pct,
        completed_count,
        total_count,
      }, { onConflict: "user_id,date" }).select().single()
    );
  } catch (err) {
    console.error("[reports] save:", err.message);
    throw err;
  }
}

export async function getMyReports(limit = 7) {
  return q(() =>
    supabase.from("daily_reports")
      .select("*")
      .order("date", { ascending: false })
      .limit(limit)
  );
}

export async function getRestaurantReports(date) {
  return q(() =>
    supabase.from("daily_reports")
      .select("*, profiles(name, station)")
      .eq("date", date)
      .order("completed_pct", { ascending: false })
  );
}

export async function sendReportEmail(date) {
  try {
    const { data, error } = await supabase.functions.invoke("send-report", {
      body: { date }
    });
    if (error) throw new Error(error.message);
    return data;
  } catch (err) {
    console.error("[reports] sendEmail:", err.message);
    throw err;
  }
}

// ── DEFERRED TASKS ────────────────────────────────────────────

export async function getDeferredTasks() {
  return q(() =>
    supabase.from("deferred_tasks")
      .select("*")
      .eq("carried", false)
      .order("created_at")
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

// ── PUSH SUBSCRIPTIONS ────────────────────────────────────────

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export async function subscribePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  const reg = await navigator.serviceWorker.ready;
  try {
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await savePushSubscription(existing);
      return existing;
    }
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    await savePushSubscription(sub);
    return sub;
  } catch (err) {
    console.error("[push] subscribe:", err.message);
    return null;
  }
}

async function savePushSubscription(sub) {
  const profile = await getCurrentProfile();
  const { endpoint, keys } = sub.toJSON();
  return q(() =>
    supabase.from("push_subscriptions").upsert({
      user_id:       profile.id,
      restaurant_id: profile.restaurant_id,
      endpoint,
      p256dh: keys.p256dh,
      auth:   keys.auth,
    }, { onConflict: "user_id,endpoint" })
  );
}

export async function sendPushNotification({ title, body, station }) {
  try {
    const { data, error } = await supabase.functions.invoke("send-push", {
      body: { title, body, station }
    });
    if (error) throw new Error(error.message);
    return data;
  } catch (err) {
    console.error("[push] send:", err.message);
    throw err;
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}
