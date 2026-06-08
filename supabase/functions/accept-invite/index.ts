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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { token, email, name, password } = await req.json();
    if (!token)    throw new Error("token required");
    if (!email)    throw new Error("email required");
    if (!name)     throw new Error("name required");
    if (!password) throw new Error("password required");

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
      // Check if user was actually created despite the error (e.g. timeout on a successful request).
      // If so, recover by proceeding to profile upsert instead of rolling back.
      const { data: existingUsers } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existingUser = existingUsers?.users?.find(u => u.email === email);
      if (existingUser) {
        authData = { user: existingUser } as typeof authData;
      } else {
        await supabase.from("invites").update({ used: false }).eq("token", token);
        throw new Error(authErr.message);
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
