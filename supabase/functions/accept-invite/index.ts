// supabase/functions/accept-invite/index.ts
// Validates invite token, creates auth user, returns session.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "https://staging.mis-kitchen-prod.pages.dev",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Validate token — do NOT mark used here; handle_new_user trigger does that atomically.
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

    // For email-specific invites, verify the submitted email matches (case-insensitive).
    if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) {
      throw new Error("Invalid or expired invite link");
    }

    // Create auth user. The handle_new_user trigger fires on INSERT into auth.users:
    //   - it finds the invite (used=false, token matches via user_metadata.invite_token)
    //   - it creates the profile row
    //   - it marks the invite used=true
    // Pass invite_token in user_metadata so the trigger can match link-based invites.
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: invite.role, station: invite.station, invite_token: token },
    });

    if (authErr) {
      // Account-takeover guard: if the user already exists for a different reason,
      // do NOT silently bind them to this restaurant. Reject outright.
      // The invite remains unused so the admin can re-invite with the correct email.
      console.error(`[accept-invite] createUser failed: ${authErr.message} | email=${email}`);
      throw new Error("Failed to create account. Please contact your admin.");
    }

    const userId = authData.user.id;

    // Upsert profile — trigger already inserted the row, but we add password_set=true
    // and override name in case the trigger ran with stale metadata.
    const { error: upsertErr } = await supabase.from("profiles").upsert({
      id: userId,
      name,
      password_set: true,
      role: invite.role,
      station: invite.station,
      restaurant_id: invite.restaurant_id,
    }, { onConflict: "id" });

    if (upsertErr) {
      console.error(`[accept-invite] upsert profile failed: ${upsertErr.message}`);
      // Trigger already marked invite used — do not roll back (user exists, can sign in).
      throw new Error(`Failed to update profile: ${upsertErr.message}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error(`[accept-invite] 400: ${err.message}`);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
