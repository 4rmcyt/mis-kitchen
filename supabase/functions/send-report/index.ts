// supabase/functions/send-report/index.ts
//
// Deploy:  supabase functions deploy send-report
// Env var: supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
//
// Called from the app:
//   const { data, error } = await supabase.functions.invoke('send-report', {
//     body: { date: '2026-05-13' }   // optional, defaults to today
//   })

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM_EMAIL     = Deno.env.get("FROM_EMAIL") ?? "reports@yourdomain.com";

// ── CORS headers ─────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "https://staging.mis-kitchen-prod.pages.dev",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Email HTML builder ────────────────────────────────────────
function buildEmail(report: any, profile: any): string {
  const pctColor = report.completed_pct >= 90 ? "#10B981"
    : report.completed_pct >= 70 ? "#F97316"
    : "#EF4444";

  const sections = (report.sections as any[]).map(sec => {
    const done   = sec.items.filter((i: any) => i.done);
    const missed = sec.items.filter((i: any) => !i.done);
    return `
      <div style="margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:8px;border-bottom:1px solid #252525;padding-bottom:8px;margin-bottom:10px">
          <strong style="color:#e8e8e0;font-size:13px;text-transform:uppercase;letter-spacing:0.5px">${sec.name}</strong>
          <span style="color:#555;font-size:11px;margin-left:auto">${done.length}/${sec.items.length}</span>
        </div>
        ${done.map((i: any)   => `<div style="padding:4px 0;color:#555;font-size:13px">✓ ${i.text}</div>`).join("")}
        ${missed.map((i: any) => `<div style="padding:4px 0;color:#ef4444;font-size:13px">✗ ${i.text}</div>`).join("")}
      </div>`;
  }).join("");

  const nextShift = (report.next_shift as any[]);
  const nextBlock = nextShift.length > 0 ? `
    <div style="margin-top:20px;padding:14px;background:#1a1a1a;border-radius:8px;border:1px solid rgba(249,115,22,0.25)">
      <div style="color:#f97316;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">→ Carried to next shift</div>
      ${nextShift.map((t: any) => `
        <div style="padding:4px 0;color:#e8e8e0;font-size:13px">
          • ${t.text}${t.station && t.station !== "All" ? ` <span style="color:#888">[${t.station}]</span>` : ""}
        </div>`).join("")}
    </div>` : "";

  const date = new Date(report.date).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric"
  });

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0c0c0c;color:#e8e8e0;font-family:'Courier New',monospace;padding:0;margin:0">
  <div style="max-width:580px;margin:0 auto;padding:32px 24px">

    <!-- Header -->
    <div style="margin-bottom:28px">
      <div style="font-size:26px;font-weight:800;letter-spacing:-1px;font-family:Georgia,serif">
        mis<span style="color:#f97316">.</span>
      </div>
      <div style="color:#555;font-size:11px;margin-top:3px;text-transform:uppercase;letter-spacing:0.5px">
        End of shift report
      </div>
    </div>

    <!-- Summary card -->
    <div style="background:#141414;border-radius:10px;padding:20px;margin-bottom:28px;border:1px solid #252525">
      <div style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">${date}</div>
      <div style="font-size:42px;font-weight:700;color:${pctColor};margin-top:6px;line-height:1;font-family:Georgia,serif">
        ${report.completed_pct}%
      </div>
      <div style="color:#888;font-size:13px;margin-top:4px">
        ${report.completed_count} of ${report.total_count} tasks completed
        · ${profile.name} · ${profile.station}
      </div>
    </div>

    <!-- Sections -->
    ${sections}

    <!-- Next shift -->
    ${nextBlock}

    <!-- Footer -->
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #1a1a1a;color:#333;font-size:10px;text-transform:uppercase;letter-spacing:0.5px">
      mis — line cook app · sent automatically at end of shift
    </div>
  </div>
</body>
</html>`;
}

// ── Main handler ──────────────────────────────────────────────
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Authenticate the calling user via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Use service role client to bypass RLS for reading (safe — we validate user below)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Validate the user's JWT and get their identity
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, name, station, restaurant_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 3. Parse request body — which date to report on
    const body = await req.json().catch(() => ({}));
    const reportDate = body.date ?? new Date().toISOString().split("T")[0];

    // 4. Fetch the report — user can only fetch their own (enforced by user_id filter)
    const { data: report, error: reportError } = await supabase
      .from("daily_reports")
      .select("*")
      .eq("user_id", user.id)   // strict: user can only email their own report
      .eq("date", reportDate)
      .single();

    if (reportError || !report) {
      return new Response(JSON.stringify({ error: "Report not found for this date" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 5. Send email via Resend — API key NEVER leaves the server
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:    `Mis App <${FROM_EMAIL}>`,
        to:      [user.email!],
        subject: `Shift report — ${reportDate} (${report.completed_pct}% done)`,
        html:    buildEmail(report, profile),
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.json();
      throw new Error(err.message ?? "Resend error");
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("send-report error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
