// supabase/functions/push-sync/index.ts
//
// Syncs employees + today's schedules from Push Operations → Supabase
//
// Deploy:
//   supabase functions deploy push-sync
//
// Secrets:
//   supabase secrets set PUSH_API_TOKEN=your_bearer_token
//   supabase secrets set PUSH_COMPANY_UUID=your_company_uuid
//
// Schedule (runs daily at 6am via pg_cron — see migration 002):
//   SELECT cron.schedule('push-sync-daily', '0 6 * * *',
//     $$SELECT net.http_post(
//       url := 'https://<ref>.supabase.co/functions/v1/push-sync',
//       headers := '{"Authorization": "Bearer <service_role_key>"}'
//     )$$
//   );
//
// Also callable manually:
//   supabase functions invoke push-sync

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const PUSH_API_TOKEN    = Deno.env.get("PUSH_API_TOKEN")!;
const PUSH_COMPANY_UUID = Deno.env.get("PUSH_COMPANY_UUID")!;
const PUSH_BASE_URL     = "https://api.pushoperations.com/api/v1";

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Push API client ───────────────────────────────────────────
async function pushGet(path: string): Promise<any> {
  const res = await fetch(`${PUSH_BASE_URL}${path}`, {
    headers: {
      "Authorization": `Bearer ${PUSH_API_TOKEN}`,
      "Push-Company-Uuid": PUSH_COMPANY_UUID,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Push API ${path} → ${res.status}: ${text}`);
  }

  return res.json();
}

// ── Fetch all pages of an endpoint ───────────────────────────
async function pushGetAll(path: string): Promise<any[]> {
  const results: any[] = [];
  let page = 1;

  while (true) {
    const separator = path.includes("?") ? "&" : "?";
    const data = await pushGet(`${path}${separator}page=${page}&limit=100`);

    // Push returns { data: [...], meta: { total, page, limit } }
    const items = data.data ?? data ?? [];
    results.push(...items);

    const meta = data.meta;
    if (!meta || page * meta.limit >= meta.total) break;
    page++;
  }

  return results;
}

// ── Map Push employee → Mis profile fields ────────────────────
function mapEmployee(emp: any, restaurantId: string) {
  // Push employee object shape (approximate — adjust to actual API response):
  // {
  //   id: "push-uuid",
  //   firstName: "Marco",
  //   lastName: "Rossi",
  //   email: "marco@restaurant.io",
  //   status: "active" | "inactive" | "terminated",
  //   employmentType: "full_time" | "part_time",
  //   position: { name: "Line Cook" },
  //   department: { name: "Kitchen" },
  // }

  const station = inferStation(emp.position?.name ?? emp.department?.name ?? "");

  return {
    push_employee_id: emp.id,
    restaurant_id:    restaurantId,
    name:             `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim(),
    email:            emp.email?.toLowerCase() ?? null,
    station,
    active:           emp.status === "active",
    role:             "cook",   // default — admins must be promoted manually in Mis
  };
}

// ── Infer kitchen station from Push job title ─────────────────
function inferStation(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("grill") || t.includes("broil"))          return "Grill";
  if (t.includes("sauté") || t.includes("saute") ||
      t.includes("sauté") || t.includes("hot"))            return "Sauté";
  if (t.includes("cold") || t.includes("salad") ||
      t.includes("garde") || t.includes("pantry"))         return "Garde";
  if (t.includes("pastry") || t.includes("dessert") ||
      t.includes("bak"))                                   return "Pastry";
  if (t.includes("prep"))                                   return "Prep";
  return "All";
}

// ── Map Push schedule shift → Mis format ─────────────────────
function mapShift(shift: any) {
  // Push schedule object (approximate):
  // {
  //   id: "shift-uuid",
  //   employeeId: "push-employee-uuid",
  //   locationId: "location-uuid",
  //   startTime: "2026-05-13T08:00:00",
  //   endTime:   "2026-05-13T16:00:00",
  //   position:  { name: "Line Cook" },
  //   published: true,
  // }
  return {
    push_shift_id:    shift.id,
    push_employee_id: shift.employeeId,
    station:          inferStation(shift.position?.name ?? ""),
    start_time:       shift.startTime,
    end_time:         shift.endTime,
    date:             shift.startTime?.split("T")[0],
    published:        shift.published ?? true,
  };
}

// ── Main sync logic ───────────────────────────────────────────
async function runSync(supabase: any, restaurantId: string) {
  const log: string[] = [];
  const today = new Date().toISOString().split("T")[0];

  // ── 1. Sync employees ────────────────────────────────────────
  log.push("Fetching employees from Push...");
  const pushEmployees = await pushGetAll("/employees");
  log.push(`  Found ${pushEmployees.length} employees`);

  let created = 0, updated = 0, deactivated = 0;

  for (const emp of pushEmployees) {
    if (!emp.email) continue;  // skip employees without email

    const mapped = mapEmployee(emp, restaurantId);

    // Check if profile exists (by push_employee_id or email)
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, role, push_employee_id")
      .or(`push_employee_id.eq.${emp.id},email.eq.${emp.email?.toLowerCase()}`)
      .single();

    if (existing) {
      // Update — but never downgrade role (chef/admin stays admin)
      const updateData: any = {
        push_employee_id: emp.id,
        name:             mapped.name,
        station:          mapped.station,
        active:           mapped.active,
      };
      // Only update email if push_employee_id was the match
      if (existing.push_employee_id === emp.id) {
        updateData.email = mapped.email;
      }

      await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", existing.id);

      if (!mapped.active) deactivated++;
      else updated++;
    } else {
      // New employee — create a pending profile
      // They'll complete signup via invite email
      const { error } = await supabase
        .from("profiles")
        .insert({
          ...mapped,
          id: crypto.randomUUID(),  // temporary — replaced when they sign up
        });

      if (!error) {
        created++;
        // Auto-send invite if email is present
        await supabase.from("invites").insert({
          restaurant_id: restaurantId,
          invited_by:    null,   // system invite
          email:         mapped.email,
          role:          "cook",
          station:       mapped.station,
          source:        "push_sync",
        });
      }
    }
  }

  log.push(`  Employees: ${created} created, ${updated} updated, ${deactivated} deactivated`);

  // ── 2. Sync today's schedule ─────────────────────────────────
  log.push(`Fetching schedule for ${today}...`);

  // Labour endpoints use date range, max 2 days
  const scheduleData = await pushGet(
    `/schedules?start_date=${today}&end_date=${today}`
  );
  const shifts = scheduleData.data ?? scheduleData ?? [];
  log.push(`  Found ${shifts.length} shifts for today`);

  // Upsert shifts into push_shifts table
  if (shifts.length > 0) {
    const mappedShifts = shifts.map(mapShift).filter(s => s.push_employee_id);

    const { error } = await supabase
      .from("push_shifts")
      .upsert(mappedShifts, { onConflict: "push_shift_id" });

    if (error) log.push(`  ⚠ Shifts upsert error: ${error.message}`);
    else log.push(`  Shifts synced: ${mappedShifts.length}`);
  }

  // ── 3. Update who's working today in profiles ─────────────────
  // Mark employees as "on_shift_today" for the app to use
  const workingEmployeeIds = shifts
    .filter((s: any) => s.published)
    .map((s: any) => s.employeeId);

  if (workingEmployeeIds.length > 0) {
    await supabase
      .from("profiles")
      .update({ on_shift_today: true })
      .in("push_employee_id", workingEmployeeIds)
      .eq("restaurant_id", restaurantId);

    // Reset everyone else
    await supabase
      .from("profiles")
      .update({ on_shift_today: false })
      .not("push_employee_id", "in", `(${workingEmployeeIds.join(",")})`)
      .eq("restaurant_id", restaurantId);
  }

  log.push("Sync complete ✓");
  return { ok: true, log, stats: { created, updated, deactivated, shifts: shifts.length } };
}

// ── HTTP handler ──────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get restaurant_id from request body, or sync all restaurants
    const body = await req.json().catch(() => ({}));
    const restaurantId = body.restaurant_id;

    if (!restaurantId) {
      // Sync all active restaurants
      const { data: restaurants } = await supabase
        .from("restaurants")
        .select("id, name, push_company_uuid")
        .eq("active", true);

      const results = [];
      for (const restaurant of restaurants ?? []) {
        // Override company UUID per restaurant if set
        if (restaurant.push_company_uuid) {
          // In production: each restaurant may have its own Push account
          // For now we use the global PUSH_COMPANY_UUID
        }
        const result = await runSync(supabase, restaurant.id);
        results.push({ restaurant: restaurant.name, ...result });
      }

      return new Response(JSON.stringify({ ok: true, results }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await runSync(supabase, restaurantId);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("push-sync error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
