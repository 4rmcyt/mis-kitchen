// src/lib/push.js
//
// Frontend helpers for Push Operations integration.
// All actual Push API calls happen server-side (Edge Functions).
// This file only talks to Supabase — never directly to Push.

import { supabase } from "./supabase.js";

// ── Schedule ──────────────────────────────────────────────────

// Get today's schedule — who's working and when
export async function getTodaysSchedule() {
  const { data, error } = await supabase
    .from("todays_schedule")
    .select("*");
  if (error) throw error;
  return data ?? [];
}

// Get shifts for a specific cook (their own upcoming week)
export async function getMyShifts(days = 7) {
  const today = new Date().toISOString().split("T")[0];
  const end   = new Date(Date.now() + days * 86400000).toISOString().split("T")[0];

  const { data: profile } = await supabase
    .from("profiles")
    .select("push_employee_id")
    .eq("id", (await supabase.auth.getUser()).data.user?.id)
    .single();

  if (!profile?.push_employee_id) return [];

  const { data, error } = await supabase
    .from("push_shifts")
    .select("*")
    .eq("push_employee_id", profile.push_employee_id)
    .gte("date", today)
    .lte("date", end)
    .order("start_time");

  if (error) throw error;
  return data ?? [];
}

// ── Manual sync trigger (admin only) ─────────────────────────

export async function triggerSync() {
  const { data, error } = await supabase.functions.invoke("push-sync");
  if (error) throw error;
  return data;
}

// ── Clock events ──────────────────────────────────────────────

// Get clock-in/out history for current user
export async function getMyClockHistory(limit = 14) {
  const { data, error } = await supabase
    .from("clock_events")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// Admin: get clock events for the whole team today
export async function getTodaysClockEvents() {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("clock_events")
    .select(`
      *,
      profiles ( name, station )
    `)
    .gte("timestamp", `${today}T00:00:00`)
    .lte("timestamp", `${today}T23:59:59`)
    .order("timestamp");
  if (error) throw error;
  return data ?? [];
}

// ── Realtime: listen for schedule changes ─────────────────────
//
// Subscribe to schedule updates — when Push sends a webhook
// and the DB is updated, all connected clients see it immediately.
//
// Usage in React:
//   useEffect(() => {
//     const unsub = subscribeToSchedule((schedule) => {
//       setTodaysSchedule(schedule);
//     });
//     return unsub;
//   }, []);

export function subscribeToSchedule(callback) {
  const channel = supabase
    .channel("push_shifts_today")
    .on(
      "postgres_changes",
      {
        event:  "*",
        schema: "public",
        table:  "push_shifts",
        filter: `date=eq.${new Date().toISOString().split("T")[0]}`,
      },
      async () => {
        // Re-fetch full schedule on any change
        const schedule = await getTodaysSchedule();
        callback(schedule);
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// Subscribe to profile changes (on_shift_today updates)
export function subscribeToPresence(callback) {
  const channel = supabase
    .channel("profiles_presence")
    .on(
      "postgres_changes",
      {
        event:  "UPDATE",
        schema: "public",
        table:  "profiles",
      },
      (payload) => callback(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ── Integration status (admin) ────────────────────────────────

export async function getPushIntegrationStatus() {
  // Check last webhook received
  const { data: lastWebhook } = await supabase
    .from("push_webhook_log")
    .select("event_type, received_at")
    .order("received_at", { ascending: false })
    .limit(5);

  // Check last sync
  const { data: profiles } = await supabase
    .from("profiles")
    .select("push_employee_id")
    .not("push_employee_id", "is", null)
    .limit(1);

  // Check today's shifts
  const { count: shiftCount } = await supabase
    .from("push_shifts")
    .select("*", { count: "exact", head: true })
    .eq("date", new Date().toISOString().split("T")[0]);

  return {
    connected:       (profiles?.length ?? 0) > 0,
    shifts_today:    shiftCount ?? 0,
    recent_webhooks: lastWebhook ?? [],
  };
}
