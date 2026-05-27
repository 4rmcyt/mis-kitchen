import { supabase, q } from './client.js';
import type { Station } from './types.js';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

export async function subscribePush(): Promise<PushSubscription | null> {
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
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as ArrayBuffer,
    });
    await savePushSubscription(sub);
    return sub;
  } catch (err) {
    console.error("[push] subscribe error:", (err as Error).message);
    return null;
  }
}

async function savePushSubscription(sub: PushSubscription) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, restaurant_id")
    .eq("id", session.user.id)
    .single();
  if (!profile) return;
  const json = sub.toJSON();
  return q(() =>
    supabase.from("push_subscriptions").upsert({
      user_id:       profile.id,
      restaurant_id: profile.restaurant_id,
      endpoint:      json.endpoint,
      p256dh:        json.keys?.p256dh,
      auth:          json.keys?.auth,
    }, { onConflict: "user_id,endpoint" })
  );
}

export async function sendPushNotification({ title, body, station }: { title: string; body: string; station?: Station }) {
  try {
    const { data, error } = await supabase.functions.invoke("send-push", {
      body: { title, body, station }
    });
    if (error) throw new Error(error.message);
    return data as { ok: boolean; sent: number; failed: number };
  } catch (err) {
    console.error("[push] send:", (err as Error).message);
    throw err;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}
