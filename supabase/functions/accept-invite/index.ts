// supabase/functions/accept-invite/index.ts
// Validates invite token, creates auth user, returns session.
// Deploy: supabase functions deploy accept-invite

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "https://staging.mis-kitchen-prod.pages.dev",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Paginated listUsers — mirrors deleteTestUser loop in e2e/support/supabase_admin.js
async function findUserByEmail(supabase: ReturnType<typeof createClient>, email: string) {
  let page = 1;
  while (true) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    const users = data?.users ?? [];
    const found = users.find((u: { email?: string }) => u.email === email);
    if (found) return found;
    if (users.length < 1000) return null;
    page++;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { token, email, name, password } = await req.json();
    if (!token)    throw new Error("token required");
    if (!email)    throw new Error("email required");
    if (!name)     throw new Error("name required");
    if (!password) throw new Error("password required");
    if (password.length < 8) throw new Error("Password must be at least 8 characters");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Validate token
    const now = new Date().toISOString();
    const { data: invite, error: inviteErr } = await supabase
      .from("invites")
      .select("*")
      .eq("token", token)
      .eq("used", false)
      .gt("expires_at", now)
      .maybeSingle();

    if (inviteErr) throw new Error(inviteErr.message);
    if (!invite)   throw new Error("Invalid or expired invite link");

    // For email-specific invites, verify the submitted email matches (case-insensitive)
    if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) throw new Error("Invalid or expired invite link");

    // Mark invite used — .eq("used", false) is the atomic guard against double-submit.
    // If count=0, another concurrent request already claimed it.
    const { data: markData, error: markErr } = await supabase
      .from("invites")
      .update({ used: true })
      .eq("token", token)
      .eq("used", false)
      .select("id");
    if (markErr) throw new Error(markErr.message);
    if (!markData || markData.length === 0) throw new Error("Invalid or expired invite link");

    // Create auth user
    let { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: invite.role, station: invite.station, invite_token: token },
    });
    if (authErr) {
      // Recovery branch: only treat an existing user as "ours" if BOTH conditions hold:
      //   1. user.user_metadata.invite_token === token (this invite created the user)
      //   2. user was created within the last 60 seconds (timeout on a successful createUser)
      // Anything else means a pre-existing account — roll back and reject to prevent
      // an attacker from re-binding someone else's profile to a different restaurant.
      const existingUser = await findUserByEmail(supabase, email);
      const isOurs = existingUser &&
        existingUser.user_metadata?.invite_token === token &&
        (Date.now() - new Date(existingUser.created_at).getTime()) < 60_000;

      if (isOurs) {
        authData = { user: existingUser } as typeof authData;
      } else {
        await supabase.from("invites").update({ used: false }).eq("token", token);
        throw new Error("Invalid or expired invite link");
      }
    }

    const userId = authData.user.id;

    // Upsert profile — trigger may not have run yet when we get here
    const { error: upsertErr } = await supabase.from("profiles").upsert({
      id: userId,
      name,
      password_set: true,
      role: invite.role,
      station: invite.station,
      restaurant_id: invite.restaurant_id,
    }, { onConflict: "id" });
    if (upsertErr) {
      // Profile upsert failed — roll back invite so admin can retry
      await supabase.from("invites").update({ used: false }).eq("token", token);
      throw new Error(`Failed to create profile: ${upsertErr.message}`);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
