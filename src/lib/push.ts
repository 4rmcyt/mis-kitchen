import { supabase, getCurrentProfile } from './client.js';
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
  let profile;
  try {
    profile = await getCurrentProfile();
  } catch {
    console.error("[push] no profile");
    return;
  }
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;
  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id:       profile.id,
    restaurant_id: profile.restaurant_id!,
    endpoint:      json.endpoint,
    p256dh:        json.keys.p256dh,
    auth:          json.keys.auth,
  }, { onConflict: "user_id,endpoint" });
  if (error) console.error("[push] upsert failed:", error.message);
}

export async function getPushSubscriptionCount(): Promise<number> {
  const profile = await getCurrentProfile();
  const { count } = await supabase
    .from('push_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', profile.restaurant_id!);
  return count ?? 0;
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
