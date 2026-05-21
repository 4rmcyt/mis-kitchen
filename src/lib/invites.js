import { supabase, q, getCurrentProfile } from './client.js';

export async function createInvite({ email, role, station }) {
  try {
    const profile = await getCurrentProfile();
    const invite = await q(() =>
      supabase.from("invites").insert({
        email, role, station,
        restaurant_id: profile.restaurant_id,
        invited_by:    profile.id,
      }).select().single()
    );
    const { error } = await supabase.functions.invoke("send-invite", {
      body: { invite_id: invite.id }
    });
    if (error) console.warn("[invites] email send failed:", error.message);
    return invite;
  } catch (err) {
    console.error("[invites] createInvite:", err.message);
    throw err;
  }
}

export async function getInvites() {
  return q(() =>
    supabase.from("invites").select("*").order("created_at", { ascending: false })
  );
}
