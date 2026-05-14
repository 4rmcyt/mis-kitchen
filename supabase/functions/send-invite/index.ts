// supabase/functions/send-invite/index.ts
//
// Deploy:  supabase functions deploy send-invite
// Env var: supabase secrets set RESEND_API_KEY=re_xxxx FROM_EMAIL=noreply@yourdomain.com

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY       = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM_EMAIL           = Deno.env.get("FROM_EMAIL") ?? "noreply@mis.labhome.work";
const APP_URL              = Deno.env.get("APP_URL") ?? "https://mis.labhome.work";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, role, station, restaurant_id, invited_by, invited_by_name } = await req.json();
    if (!email) throw new Error("email required");
    if (!restaurant_id) throw new Error("restaurant_id required");
    if (!invited_by) throw new Error("invited_by required");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Insert invite record first — trigger handle_new_user() requires it
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const { error: inviteInsertError } = await supabase.from("invites").insert({
      email,
      role: role ?? "cook",
      station: station || null,
      restaurant_id,
      invited_by,
      expires_at: expiresAt,
      used: false,
    });
    if (inviteInsertError) throw new Error(`Failed to create invite: ${inviteInsertError.message}`);

    // Generate magic invite link via Supabase Auth
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        data: { role: role ?? "cook", station: station ?? "Grill", restaurant_id },
      },
    });
    if (linkError) {
      // Clean up invite record on failure
      await supabase.from("invites").delete().eq("email", email).eq("used", false);
      throw new Error(linkError.message);
    }

    const inviteUrl = linkData.properties?.action_link ?? APP_URL;

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
              ${invited_by_name ? `<strong style="color:#E8E8E0">${invited_by_name}</strong> has invited you to Mis Kitchen` : "You've been invited to Mis Kitchen"} as <strong style="color:#F97316">${role ?? "cook"}</strong>${station ? ` · ${station} station` : ""}.
            </p>
            <p style="color:#888;margin-bottom:24px">Click the button below to set your password and get started.</p>
            <a href="${inviteUrl}" style="display:inline-block;background:#F97316;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:700;font-size:14px">Accept Invite</a>
            <p style="color:#555;font-size:11px;margin-top:24px">Link expires in 24 hours. If you didn't expect this, ignore this email.</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend error: ${err}`);
    }

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
