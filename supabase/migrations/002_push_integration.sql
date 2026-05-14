-- ============================================================
-- MIS — Migration 002: Push Operations Integration
-- Run after 001_schema.sql
-- ============================================================


-- ── Add Push fields to existing tables ───────────────────────

-- Link profiles to Push employees
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS push_employee_id  text UNIQUE,
  ADD COLUMN IF NOT EXISTS on_shift_today    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email             text UNIQUE;

-- Link restaurants to Push companies
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS push_company_uuid text,
  ADD COLUMN IF NOT EXISTS active            boolean DEFAULT true;

-- Link invites to their source
ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';  -- 'manual' | 'push_sync'


-- ── Push shifts cache ────────────────────────────────────────
-- Mirrors today's schedule from Push, refreshed daily
CREATE TABLE IF NOT EXISTS public.push_shifts (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  push_shift_id    text UNIQUE NOT NULL,
  push_employee_id text NOT NULL,
  station          text DEFAULT 'All',
  start_time       timestamptz,
  end_time         timestamptz,
  date             date NOT NULL,
  published        boolean DEFAULT true,
  synced_at        timestamptz DEFAULT now()
);

ALTER TABLE public.push_shifts ENABLE ROW LEVEL SECURITY;

-- Admins can read all shifts in their restaurant
-- (joins through profiles on push_employee_id)
CREATE POLICY "shifts_read_admin"
  ON public.push_shifts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.push_employee_id = push_shifts.push_employee_id
        AND p.restaurant_id = get_user_restaurant()
        AND is_admin()
    )
  );

-- Cooks can see their own shifts
CREATE POLICY "shifts_read_own"
  ON public.push_shifts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.push_employee_id = push_shifts.push_employee_id
        AND p.id = auth.uid()
    )
  );


-- ── Clock events ──────────────────────────────────────────────
-- Logged when Push sends clock_in / clock_out webhook events
CREATE TABLE IF NOT EXISTS public.clock_events (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  restaurant_id  uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  event_type     text NOT NULL CHECK (event_type IN ('clock_in', 'clock_out')),
  push_entry_id  text,
  timestamp      timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE public.clock_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clock_events_own"
  ON public.clock_events FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "clock_events_admin"
  ON public.clock_events FOR SELECT
  USING (
    is_admin() AND
    restaurant_id = get_user_restaurant()
  );


-- ── Webhook audit log ────────────────────────────────────────
-- Every incoming Push webhook is logged for debugging
CREATE TABLE IF NOT EXISTS public.push_webhook_log (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type   text,
  payload      jsonb,
  received_at  timestamptz DEFAULT now()
);

-- Only superadmins can read webhook logs (via service role in practice)
ALTER TABLE public.push_webhook_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_log_superadmin"
  ON public.push_webhook_log FOR SELECT
  USING (get_user_role() = 'superadmin');


-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_push_employee
  ON public.profiles(push_employee_id);

CREATE INDEX IF NOT EXISTS idx_profiles_on_shift
  ON public.profiles(restaurant_id, on_shift_today)
  WHERE on_shift_today = true;

CREATE INDEX IF NOT EXISTS idx_push_shifts_date
  ON public.push_shifts(date, push_employee_id);

CREATE INDEX IF NOT EXISTS idx_clock_events_user
  ON public.clock_events(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_log_event
  ON public.push_webhook_log(event_type, received_at DESC);


-- ── pg_cron: schedule daily sync at 06:00 ────────────────────
-- Requires pg_cron extension — enable in Supabase Dashboard:
-- Database → Extensions → pg_cron
--
-- Also requires pg_net for HTTP calls from cron.
-- Database → Extensions → pg_net

-- Uncomment and fill in your values after enabling extensions:
--
-- SELECT cron.schedule(
--   'push-sync-daily',
--   '0 6 * * *',
--   $$
--     SELECT net.http_post(
--       url     := 'https://<YOUR_REF>.supabase.co/functions/v1/push-sync',
--       headers := jsonb_build_object(
--         'Content-Type',  'application/json',
--         'Authorization', 'Bearer <YOUR_SERVICE_ROLE_KEY>'
--       ),
--       body    := '{}'::jsonb
--     );
--   $$
-- );


-- ── Helper: get today's schedule for the app ─────────────────
-- Returns who is scheduled today with their Mis profile
CREATE OR REPLACE VIEW public.todays_schedule AS
  SELECT
    p.id          AS profile_id,
    p.name,
    p.station,
    p.email,
    p.role,
    p.on_shift_today,
    s.start_time,
    s.end_time,
    s.push_shift_id
  FROM public.profiles p
  LEFT JOIN public.push_shifts s
    ON s.push_employee_id = p.push_employee_id
    AND s.date = CURRENT_DATE
    AND s.published = true
  WHERE p.restaurant_id = get_user_restaurant()
    AND p.active = true
  ORDER BY s.start_time NULLS LAST, p.name;

-- RLS on view: everyone in the restaurant can see today's schedule
-- (cooks see who's in, admins use it for reports)
