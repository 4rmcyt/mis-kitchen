import { supabase, q, getCurrentProfile } from './client.js';
import type { Invite, Role, Station } from './types.js';

export async function createInvite({ email, role, station }: { email: string; role: Role; station: Station }) {
  try {
    const profile = await getCurrentProfile();
    const invite = await q<Invite>(() =>
      supabase.from("invites").insert({
        email, role, station,
        restaurant_id: profile.restaurant_id,
        invited_by:    profile.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any).select().single()
    );
    const { error } = await supabase.functions.invoke("send-invite", {
      body: { invite_id: invite.id }
    });
    if (error) console.warn("[invites] email send failed:", error.message);
    return invite;
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
