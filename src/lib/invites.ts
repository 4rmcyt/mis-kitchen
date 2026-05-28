import { supabase, getCurrentProfile } from './client.js';
import type { Role, Station } from './types.js';

export async function createInvite({ email, role, station }: { email: string; role: Role; station: Station }) {
  try {
    const profile = await getCurrentProfile();
    const { error } = await supabase.functions.invoke("send-invite", {
      body: {
        email,
        role,
        station,
        restaurant_id: profile.restaurant_id,
        invited_by:    profile.id,
      }
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error("[invites] createInvite:", (err as Error).message);
    throw err;
  }
}

export async function getInvites(): Promise<Invite[]> {
  return q<Invite[]>(() =>
    supabase.from("invites").select("*").order("created_at", { ascending: false })
  );
}
