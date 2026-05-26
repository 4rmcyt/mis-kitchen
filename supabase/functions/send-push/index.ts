// supabase/functions/send-push/index.ts
//
// Sends Web Push notifications using RFC 8291 (aes128gcm) encryption.
// Required secrets:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY     = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY    = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT        = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@mis.kitchen";
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "https://staging.mis-kitchen-prod.pages.dev",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function b64urlToBytes(b64: string): Uint8Array {
  const pad = "=".repeat((4 - b64.length % 4) % 4);
  return Uint8Array.from(atob(b64.replace(/-/g, "+").replace(/_/g, "/") + pad), c => c.charCodeAt(0));
}

function bytesToB64url(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// ── VAPID JWT ────────────────────────────────────────────────
async function buildVapidAuth(endpoint: string): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const now = Math.floor(Date.now() / 1000);

  const header  = bytesToB64url(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = bytesToB64url(new TextEncoder().encode(JSON.stringify({ aud: audience, exp: now + 43200, sub: VAPID_SUBJECT })));
  const sigInput = `${header}.${payload}`;

  const privBytes = b64urlToBytes(VAPID_PRIVATE_KEY);
  const pkcs8Header = new Uint8Array([
    0x30,0x41,0x02,0x01,0x00,0x30,0x13,0x06,0x07,0x2a,0x86,0x48,0xce,0x3d,0x02,0x01,
    0x06,0x08,0x2a,0x86,0x48,0xce,0x3d,0x03,0x01,0x07,0x04,0x27,0x30,0x25,0x02,0x01,0x01,0x04,0x20,
  ]);
  const pkcs8 = new Uint8Array(pkcs8Header.length + 32);
  pkcs8.set(pkcs8Header);
  pkcs8.set(privBytes.slice(-32), pkcs8Header.length);

  const key = await crypto.subtle.importKey("pkcs8", pkcs8, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(sigInput));
  const sigB64 = bytesToB64url(new Uint8Array(sig));

  return `vapid t=${header}.${payload}.${sigB64},k=${VAPID_PUBLIC_KEY}`;
}

// ── Web Push encryption (RFC 8291 / aes128gcm) ───────────────
async function encryptPayload(
  plaintext: string,
  p256dh: string,
  auth: string,
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const clientPublicKey = await crypto.subtle.importKey(
    "raw", b64urlToBytes(p256dh),
    { name: "ECDH", namedCurve: "P-256" }, true, []
  );

  const serverKeyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const serverPublicKeyRaw = new Uint8Array(await crypto.subtle.exportKey("raw", serverKeyPair.publicKey));

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientPublicKey },
    serverKeyPair.privateKey, 256
  );

  const authBytes = b64urlToBytes(auth);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF-SHA-256 helper
  async function hkdf(ikm: Uint8Array, saltBytes: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
    const ikmKey = await crypto.subtle.importKey("raw", ikm, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const prk = new Uint8Array(await crypto.subtle.sign("HMAC", ikmKey, saltBytes));
    const prkKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const infoWithCounter = new Uint8Array([...info, 0x01]);
    const okm = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, infoWithCounter));
    return okm.slice(0, length);
  }

  // PRK_key
  const authInfo = new TextEncoder().encode("WebPush: info\0");
  const keyInfo = new Uint8Array([...authInfo, ...b64urlToBytes(p256dh), ...serverPublicKeyRaw]);
  const prkKey = await hkdf(new Uint8Array(sharedSecret), authBytes, keyInfo, 32);

  // CEK and nonce
  const cekInfo  = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");
  const cek   = await hkdf(prkKey, salt, cekInfo, 16);
  const nonce = await hkdf(prkKey, salt, nonceInfo, 12);

  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const data = new TextEncoder().encode(plaintext);
  // Add padding delimiter byte (0x02)
  const padded = new Uint8Array([...data, 0x02]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded));

  return { ciphertext, salt, serverPublicKey: serverPublicKeyRaw };
}

// ── Build RFC 8291 body ──────────────────────────────────────
function buildPushBody(ciphertext: Uint8Array, salt: Uint8Array, serverPublicKey: Uint8Array): Uint8Array {
  // salt (16) + rs (4) + keyid_len (1) + keyid (65) + ciphertext
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);
  const body = new Uint8Array(16 + 4 + 1 + 65 + ciphertext.length);
  let offset = 0;
  body.set(salt, offset); offset += 16;
  body.set(rs, offset); offset += 4;
  body[offset++] = 65;
  body.set(serverPublicKey, offset); offset += 65;
  body.set(ciphertext, offset);
  return body;
}

// ── Send one notification ────────────────────────────────────
async function sendOne(sub: { endpoint: string; p256dh: string; auth: string }, payloadJson: string): Promise<boolean> {
  try {
    const { ciphertext, salt, serverPublicKey } = await encryptPayload(payloadJson, sub.p256dh, sub.auth);
    const body = buildPushBody(ciphertext, salt, serverPublicKey);
    const authHeader = await buildVapidAuth(sub.endpoint);

    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        "Authorization":    authHeader,
        "Content-Type":     "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "TTL":              "86400",
      },
      body,
    });

    if (res.status === 410 || res.status === 404) return false;
    if (!res.ok) {
      console.error(`push failed ${res.status}:`, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("sendOne error:", e);
    return false;
  }
}

// ── Main handler ─────────────────────────────────────────────
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
      const { data: stationUsers } = await supabase.from("profiles").select("id").eq("restaurant_id", profile.restaurant_id).eq("station", station).eq("active", true);
      const ids = (stationUsers ?? []).map((p: any) => p.id);
      if (ids.length === 0) return new Response(JSON.stringify({ ok: true, sent: 0, failed: 0 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      query = query.in("user_id", ids);
    }

    const { data: subs } = await query;
    if (!subs || subs.length === 0) return new Response(JSON.stringify({ ok: true, sent: 0, failed: 0 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const payload = JSON.stringify({ title, body: msgBody });
    const staleIds: string[] = [];
    let sent = 0;

    await Promise.all(subs.map(async (sub) => {
      const ok = await sendOne(sub, payload);
      if (ok) sent++;
      else staleIds.push(sub.id);
    }));

    if (staleIds.length > 0) await supabase.from("push_subscriptions").delete().in("id", staleIds);

    return new Response(JSON.stringify({ ok: true, sent, failed: staleIds.length }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("send-push error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
