import { supabase, q, getCurrentProfile } from './client.js';
import type { Role, Station, Invite } from './types.js';
import { buildLinkInvitePayload, buildEmailInvitePayload } from '../domain/invites.js';

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

export async function createLinkInvite({ role, station }: { role: Role; station: Station }): Promise<string> {
  const profile = await getCurrentProfile();
  const token = crypto.randomUUID();
  const payload = buildLinkInvitePayload({
    restaurantId: profile.restaurant_id,
    invitedBy: profile.id,
    role,
    station,
    token,
  });
  await q(() => supabase.from('invites').insert(payload));
  return token;
}

export async function createEmailInvite({ email, role, station }: { email: string; role: Role; station: Station }): Promise<void> {
  const profile = await getCurrentProfile();
  const payload = buildEmailInvitePayload({
    email,
    role,
    station,
    restaurantId: profile.restaurant_id,
    invitedBy: profile.id,
    invitedByName: profile.name ?? '',
  });
  const { data, error } = await supabase.functions.invoke('send-invite', { body: payload });
  if (error || data?.error) throw new Error(error?.message || data?.error);
}

export async function getInvites(): Promise<Invite[]> {
  return q<Invite[]>(() =>
    supabase.from("invites").select("*").order("created_at", { ascending: false })
  );
}
