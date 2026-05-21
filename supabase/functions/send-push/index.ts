// supabase/functions/send-push/index.ts
//
// Sends Web Push notifications to restaurant staff.
// Called from Admin panel.
//
// Required secrets:
//   supabase secrets set VAPID_PUBLIC_KEY=BNU4XY1yGWw6...
//   supabase secrets set VAPID_PRIVATE_KEY=2jPn0V2h7x...
//   supabase secrets set VAPID_SUBJECT=mailto:admin@mis.kitchen

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY  = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT     = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@mis.kitchen";
const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── VAPID JWT builder (no external lib — pure Web Crypto) ─────
async function buildVapidAuth(endpoint: string): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const now = Math.floor(Date.now() / 1000);

  const header  = btoa(JSON.stringify({ typ: "JWT", alg: "ES256" })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payload = btoa(JSON.stringify({ aud: audience, exp: now + 43200, sub: VAPID_SUBJECT })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const sigInput = `${header}.${payload}`;

  // Import private key (base64url PKCS8)
  const privBytes = Uint8Array.from(atob(VAPID_PRIVATE_KEY.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));

  // VAPID private key is raw 32 bytes — wrap in PKCS8 for Web Crypto
  const pkcs8Header = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06,
    0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
    0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01,
    0x01, 0x04, 0x20,
  ]);
  const pkcs8 = new Uint8Array(pkcs8Header.length + 32);
  pkcs8.set(pkcs8Header);
  pkcs8.set(privBytes.slice(-32), pkcs8Header.length);

  const key = await crypto.subtle.importKey(
    "pkcs8", pkcs8,
    { name: "ECDSA", namedCurve: "P-256" },
    false, ["sign"]
  );

  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(sigInput)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `vapid t=${header}.${payload}.${sigB64},k=${VAPID_PUBLIC_KEY}`;
}

// ── Send a single push notification ──────────────────────────
async function sendOne(sub: { endpoint: string; p256dh: string; auth: string }, payload: string): Promise<boolean> {
  try {
    const authHeader = await buildVapidAuth(sub.endpoint);
    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type":  "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "TTL": "86400",
      },
      // Unencrypted payload — push services accept plaintext for basic notifications
      // For encrypted payloads (ECDH+HKDF) a full web-push library would be needed
      body: new TextEncoder().encode(payload),
    });

    // 410 Gone or 404 = subscription expired, should be removed
    if (res.status === 410 || res.status === 404) return false;
    return res.ok;
  } catch {
    return false;
  }
}

// ── Main handler ──────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth — must be admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Verify caller is admin/superadmin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, restaurant_id")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "superadmin"].includes(profile.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Parse body: { title, body, station? }
    // station: undefined = all staff, "Grill" etc = filter by station
    const body = await req.json().catch(() => ({}));
    const { title, body: msgBody, station } = body as { title: string; body: string; station?: string };

    if (!title || !msgBody) {
      return new Response(JSON.stringify({ error: "title and body are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Fetch target subscriptions
    let query = supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, user_id")
      .eq("restaurant_id", profile.restaurant_id);

    // Filter by station — join to profiles
    if (station) {
      const { data: stationUsers } = await supabase
        .from("profiles")
        .select("id")
        .eq("restaurant_id", profile.restaurant_id)
        .eq("station", station)
        .eq("active", true);

      const ids = (stationUsers ?? []).map((p: any) => p.id);
      if (ids.length === 0) {
        return new Response(JSON.stringify({ ok: true, sent: 0, failed: 0 }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      query = query.in("user_id", ids);
    }

    const { data: subs } = await query;
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, failed: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const payload = JSON.stringify({ title, body: msgBody });
    const staleIds: string[] = [];
    let sent = 0;

    await Promise.all(subs.map(async (sub) => {
      const ok = await sendOne(sub, payload);
      if (ok) sent++;
      else staleIds.push(sub.id);
    }));

    // Remove expired subscriptions
    if (staleIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", staleIds);
    }

    return new Response(JSON.stringify({ ok: true, sent, failed: staleIds.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("send-push error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
