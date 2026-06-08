// supabase/functions/send-invite/index.ts
//
// Deploy:  supabase functions deploy send-invite
// Env var: supabase secrets set RESEND_API_KEY=re_xxxx FROM_EMAIL=noreply@yourdomain.com

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_KEY       = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY    = Deno.env.get("SUPABASE_ANON_KEY")!;
const FROM_EMAIL           = Deno.env.get("FROM_EMAIL") ?? "noreply@mail.labhome.work";
const APP_URL              = Deno.env.get("APP_URL") ?? "https://mis.labhome.work";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "https://staging.mis-kitchen-prod.pages.dev",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify caller identity — never trust restaurant_id/invited_by from body
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Invalid token");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: callerProfile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, restaurant_id, role, name")
      .eq("id", user.id)
      .single();
    if (profileErr || !callerProfile) throw new Error("Profile not found");
    if (!["admin", "superadmin"].includes(callerProfile.role)) throw new Error("Forbidden");

    const { email, role, station } = await req.json();
    if (!email) throw new Error("email required");

    // Use verified values from DB, not from request body
    const restaurant_id = callerProfile.restaurant_id;
    const invited_by    = callerProfile.id;

    // Insert invite record first — trigger handle_new_user() requires it
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const inviteToken = crypto.randomUUID();
    const { error: inviteInsertError } = await supabase.from("invites").insert({
      email,
      role: role ?? "cook",
      station: station || null,
      restaurant_id,
      invited_by,
      expires_at: expiresAt,
      used: false,
      token: inviteToken,
    });
    if (inviteInsertError) throw new Error(`Failed to create invite: ${inviteInsertError.message}`);

    const inviteUrl = `${APP_URL}/join/${inviteToken}`;

    // Escape user-supplied strings before inserting into HTML
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const safeRole    = esc(role ?? "cook");
    const safeStation = station ? esc(station) : null;
    const inviterLine = callerProfile.name
      ? `<strong style="color:#E8E8E0">${esc(callerProfile.name)}</strong> has invited you to Mis Kitchen`
      : "You've been invited to Mis Kitchen";

    // Send email via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        from:    FROM_EMAIL,
        to:      email,
        subject: `You've been invited to Mis Kitchen`,
        html: `
          <div style="font-family:monospace;background:#0A0A0A;color:#E8E8E0;padding:32px;border-radius:8px;max-width:480px">
            <div style="font-size:24px;font-weight:800;margin-bottom:8px">mis<span style="color:#F97316">.</span></div>
            <h2 style="margin:0 0 16px;font-size:18px">You're invited to join the kitchen</h2>
            <p style="color:#888;margin-bottom:8px">
              ${inviterLine} as <strong style="color:#F97316">${safeRole}</strong>${safeStation ? ` · ${safeStation} station` : ""}.
            </p>
            <p style="color:#888;margin-bottom:24px">Click the button below to set your password and get started.</p>
            <a href="${inviteUrl}" style="display:inline-block;background:#F97316;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:700;font-size:14px">Accept Invite</a>
            <p style="color:#555;font-size:11px;margin-top:24px">Link expires in 48 hours. If you didn't expect this, ignore this email.</p>
          </div>
        `,
      }),
    });

    const resendBody = await res.json();
    if (!res.ok) {
      throw new Error(`Resend error: ${JSON.stringify(resendBody)}`);
    }
    console.log("[send-invite] Resend response:", JSON.stringify(resendBody));

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
