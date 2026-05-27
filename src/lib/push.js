import { supabase, q } from './client.js';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export async function subscribePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn("[push] serviceWorker or PushManager not available");
    return null;
  }
  console.log("[push] waiting for SW ready...");
  const reg = await navigator.serviceWorker.ready;
  console.log("[push] SW ready, checking existing subscription...");
  try {
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      console.log("[push] existing subscription found, saving...", existing.endpoint.slice(0, 60));
      await savePushSubscription(existing);
      return existing;
    }
    console.log("[push] no existing subscription, subscribing...");
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    console.log("[push] new subscription created:", sub.endpoint.slice(0, 60));
    await savePushSubscription(sub);
    return sub;
  } catch (err) {
    console.error("[push] subscribe error:", err.message, err);
    return null;
  }
}

async function savePushSubscription(sub) {
  console.log("[push] savePushSubscription called");
  const { data: { session } } = await supabase.auth.getSession();
  console.log("[push] session:", session ? `user=${session.user.id}` : "null");
  if (!session) return;
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, restaurant_id")
    .eq("id", session.user.id)
    .single();
  console.log("[push] profile:", profile ? `id=${profile.id} rest=${profile.restaurant_id}` : `null (err: ${profileError?.message})`);
  if (!profile) return;
  const { endpoint, keys } = sub.toJSON();
  console.log("[push] upserting subscription...");
  const result = await q(() =>
    supabase.from("push_subscriptions").upsert({
      user_id:       profile.id,
      restaurant_id: profile.restaurant_id,
      endpoint,
      p256dh: keys.p256dh,
      auth:   keys.auth,
    }, { onConflict: "user_id,endpoint" })
  );
  console.log("[push] upsert result:", result);
  return result;
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
