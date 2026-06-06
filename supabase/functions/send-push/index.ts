// supabase/functions/send-push/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const VAPID_PUBLIC_KEY     = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY    = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT        = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@mis.kitchen";
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "https://staging.mis-kitchen-prod.pages.dev",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SendResult = "sent" | "stale" | "failed";

async function sendOne(sub: { endpoint: string; p256dh: string; auth: string }, payload: string): Promise<SendResult> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
      { TTL: 86400 },
    );
    return "sent";
  } catch (e: any) {
    const status = e.statusCode ?? e.status ?? 0;
    console.error(`push failed ${status}: ${e.body ?? e.message}`);
    // 404/410 = subscription expired/unsubscribed — delete from DB
    if (status === 404 || status === 410) return "stale";
    // 429, 5xx, network errors — transient, don't delete subscription
    return "failed";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: profile } = await supabase.from("profiles").select("role, restaurant_id").eq("id", user.id).single();
    if (!profile || !["admin", "superadmin"].includes(profile.role)) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const { title, body: msgBody, station } = body as { title: string; body: string; station?: string };
    if (!title || !msgBody) return new Response(JSON.stringify({ error: "title and body are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let query = supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth, user_id").eq("restaurant_id", profile.restaurant_id);

    if (station) {
      const { data: stationUsers, error: stationErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("restaurant_id", profile.restaurant_id)
        .eq("station", station)
        .eq("active", true);
      if (stationErr) {
        console.error("stationUsers query failed:", stationErr.message);
        return new Response(JSON.stringify({ error: "Failed to load station users" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const ids = (stationUsers ?? []).map((p: any) => p.id);
      if (ids.length === 0) return new Response(JSON.stringify({ ok: true, sent: 0, failed: 0 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      query = query.in("user_id", ids);
    }

    const { data: subs } = await query;
    if (!subs || subs.length === 0) return new Response(JSON.stringify({ ok: true, sent: 0, failed: 0 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const payload = JSON.stringify({ title, body: msgBody });
    const staleIds: string[] = [];
    let sent = 0;
    let failed = 0;

    await Promise.all(subs.map(async (sub) => {
      const result = await sendOne(sub, payload);
      if (result === "sent") sent++;
      else if (result === "stale") staleIds.push(sub.id);
      else failed++;
    }));

    if (staleIds.length > 0) await supabase.from("push_subscriptions").delete().in("id", staleIds);

    return new Response(JSON.stringify({ ok: true, sent, failed: failed + staleIds.length }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("send-push error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
