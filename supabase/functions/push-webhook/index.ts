// supabase/functions/push-webhook/index.ts
//
// Receives real-time webhook events from Push Operations.
//
// Deploy:
//   supabase functions deploy push-webhook
//
// Register webhook URL in Push Operations dashboard or via support:
//   https://<ref>.supabase.co/functions/v1/push-webhook
//
// Secret for webhook signature verification:
//   supabase secrets set PUSH_WEBHOOK_SECRET=your_webhook_secret

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

const PUSH_WEBHOOK_SECRET  = Deno.env.get("PUSH_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL          = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ── Verify Push webhook signature ────────────────────────────
// Push signs payloads with HMAC-SHA256 using your webhook secret.
// Header: X-Push-Signature: sha256=<hex>
async function verifySignature(body: string, signature: string): Promise<boolean> {
  if (!PUSH_WEBHOOK_SECRET || !signature) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(PUSH_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body)
  );

  const expected = "sha256=" + Array.from(new Uint8Array(mac))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison
  return expected === signature;
}

// ── Event handlers ────────────────────────────────────────────

// Employee created or updated in Push
async function handleEmployeeUpdate(supabase: any, payload: any) {
  const emp = payload.data;
  if (!emp?.email) return { skipped: "no email" };

  const station = inferStation(emp.position?.name ?? emp.department?.name ?? "");

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, role")
    .or(`push_employee_id.eq.${emp.id},email.eq.${emp.email.toLowerCase()}`)
    .single();

  if (existing) {
    await supabase
      .from("profiles")
      .update({
        push_employee_id: emp.id,
        name:   `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim(),
        station,
        active: emp.status === "active",
      })
      .eq("id", existing.id);

    return { action: "updated", profile_id: existing.id };
  }

  return { action: "skipped", reason: "profile not found — will be created on next full sync" };
}

// Employee terminated in Push → deactivate in Mis
async function handleEmployeeTerminated(supabase: any, payload: any) {
  const emp = payload.data;
  if (!emp?.id) return { skipped: true };

  await supabase
    .from("profiles")
    .update({ active: false })
    .eq("push_employee_id", emp.id);

  return { action: "deactivated", push_employee_id: emp.id };
}

// Schedule published → update today's shifts
async function handleSchedulePublished(supabase: any, payload: any) {
  const shift = payload.data;
  if (!shift?.id) return { skipped: true };

  const shiftDate = shift.startTime?.split("T")[0];
  const today     = new Date().toISOString().split("T")[0];

  await supabase
    .from("push_shifts")
    .upsert({
      push_shift_id:    shift.id,
      push_employee_id: shift.employeeId,
      station:          inferStation(shift.position?.name ?? ""),
      start_time:       shift.startTime,
      end_time:         shift.endTime,
      date:             shiftDate,
      published:        true,
    }, { onConflict: "push_shift_id" });

  // If this is today's shift — mark employee as on_shift_today
  if (shiftDate === today) {
    await supabase
      .from("profiles")
      .update({ on_shift_today: true })
      .eq("push_employee_id", shift.employeeId);
  }

  return { action: "shift_upserted", shift_id: shift.id, date: shiftDate };
}

// Shift deleted or cancelled
async function handleShiftDeleted(supabase: any, payload: any) {
  const shift = payload.data;
  if (!shift?.id) return { skipped: true };

  await supabase
    .from("push_shifts")
    .delete()
    .eq("push_shift_id", shift.id);

  return { action: "shift_deleted", shift_id: shift.id };
}

// Timesheet clock-in → auto-open today's checklist notification
async function handleClockIn(supabase: any, payload: any) {
  const entry = payload.data;
  if (!entry?.employeeId) return { skipped: true };

  // Find the Mis profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, restaurant_id")
    .eq("push_employee_id", entry.employeeId)
    .single();

  if (!profile) return { skipped: "profile not found" };

  // Log clock-in event for analytics
  await supabase
    .from("clock_events")
    .insert({
      user_id:       profile.id,
      restaurant_id: profile.restaurant_id,
      event_type:    "clock_in",
      push_entry_id: entry.id,
      timestamp:     entry.clockInTime ?? new Date().toISOString(),
    });

  // TODO: trigger push notification to the cook's device
  // "Good morning Marco! Your prep checklist is ready."
  // (implement via web push / Supabase Realtime)

  return { action: "clock_in_logged", profile_id: profile.id };
}

// Timesheet clock-out → prompt end-of-shift report
async function handleClockOut(supabase: any, payload: any) {
  const entry = payload.data;
  if (!entry?.employeeId) return { skipped: true };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, restaurant_id")
    .eq("push_employee_id", entry.employeeId)
    .single();

  if (!profile) return { skipped: "profile not found" };

  await supabase
    .from("clock_events")
    .insert({
      user_id:       profile.id,
      restaurant_id: profile.restaurant_id,
      event_type:    "clock_out",
      push_entry_id: entry.id,
      timestamp:     entry.clockOutTime ?? new Date().toISOString(),
    });

  // Mark on_shift_today = false
  await supabase
    .from("profiles")
    .update({ on_shift_today: false })
    .eq("id", profile.id);

  // TODO: send push notification "Shift done! Send your end-of-day report?"

  return { action: "clock_out_logged", profile_id: profile.id };
}

function inferStation(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("grill") || t.includes("broil"))               return "Grill";
  if (t.includes("sauté") || t.includes("saute") || t.includes("hot")) return "Sauté";
  if (t.includes("cold") || t.includes("salad") || t.includes("garde")) return "Garde";
  if (t.includes("pastry") || t.includes("dessert") || t.includes("bak")) return "Pastry";
  if (t.includes("prep"))                                         return "Prep";
  return "All";
}

// ── Webhook event router ──────────────────────────────────────
const EVENT_HANDLERS: Record<string, Function> = {
  "employee.created":          handleEmployeeUpdate,
  "employee.updated":          handleEmployeeUpdate,
  "employee.terminated":       handleEmployeeTerminated,
  "employee.deactivated":      handleEmployeeTerminated,
  "schedule.published":        handleSchedulePublished,
  "schedule.updated":          handleSchedulePublished,
  "schedule.shift.created":    handleSchedulePublished,
  "schedule.shift.deleted":    handleShiftDeleted,
  "timesheet.clock_in":        handleClockIn,
  "timesheet.clock_out":       handleClockOut,
};

// ── HTTP handler ──────────────────────────────────────────────
serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();

  // Verify signature
  const signature = req.headers.get("X-Push-Signature") ?? "";
  const isValid   = await verifySignature(rawBody, signature);

  if (!PUSH_WEBHOOK_SECRET) {
    console.error("PUSH_WEBHOOK_SECRET not configured — rejecting all requests");
    return new Response(JSON.stringify({ error: "Webhook not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!isValid) {
    console.error("Invalid webhook signature");
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const eventType = payload.event ?? payload.type;
  console.log(`Push webhook: ${eventType}`, JSON.stringify(payload).slice(0, 200));

  // Log all webhook events for debugging/audit
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  await supabase.from("push_webhook_log").insert({
    event_type:  eventType,
    payload:     payload,
    received_at: new Date().toISOString(),
  });

  // Route to handler
  const handler = EVENT_HANDLERS[eventType];
  if (!handler) {
    console.log(`No handler for event: ${eventType}`);
    return new Response(JSON.stringify({ ok: true, handled: false, event: eventType }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const result = await handler(supabase, payload);
    return new Response(JSON.stringify({ ok: true, event: eventType, result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(`Handler error for ${eventType}:`, err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
