-- ============================================================
-- MIS — Line Cook App
-- Supabase Schema + RLS Policies
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================


-- ── EXTENSIONS ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ── HELPER FUNCTIONS ────────────────────────────────────────

-- Returns the restaurant_id of the currently authenticated user
CREATE OR REPLACE FUNCTION get_user_restaurant()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT restaurant_id FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Returns the role of the currently authenticated user
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Returns true if current user is admin or superadmin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT get_user_role() IN ('admin', 'superadmin');
$$;


-- ── RESTAURANTS ──────────────────────────────────────────────
CREATE TABLE public.restaurants (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- Only superadmins manage restaurants (handled via service role key)
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant_read_own"
  ON public.restaurants FOR SELECT
  USING (id = get_user_restaurant());


-- ── PROFILES ────────────────────────────────────────────────
-- Extends Supabase auth.users — created automatically on signup
CREATE TABLE public.profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id   uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name            text NOT NULL DEFAULT '',
  email           text UNIQUE,                -- synced from auth.users on signup
  role            text NOT NULL DEFAULT 'cook'
                    CHECK (role IN ('cook', 'admin', 'superadmin')),
  station         text DEFAULT 'All',
  active          boolean DEFAULT true,
  last_seen       timestamptz DEFAULT now(),
  joined_at       timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "profiles_read_own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

-- Admins can read all profiles in their restaurant
CREATE POLICY "profiles_read_restaurant"
  ON public.profiles FOR SELECT
  USING (
    is_admin() AND
    restaurant_id = get_user_restaurant()
  );

-- Users can update their own profile (name, station only)
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())  -- can't self-promote
  );

-- Admins can update profiles in their restaurant
CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  USING (
    is_admin() AND
    restaurant_id = get_user_restaurant()
  );

-- Auto-update last_seen on any profile read (via trigger)
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles SET last_seen = now() WHERE id = auth.uid();
  RETURN NEW;
END;
$$;


-- ── INVITES ──────────────────────────────────────────────────
-- Invite-only registration — no self-signup
CREATE TABLE public.invites (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  invited_by      uuid NOT NULL REFERENCES public.profiles(id),
  email           text NOT NULL,
  role            text NOT NULL DEFAULT 'cook'
                    CHECK (role IN ('cook', 'admin')),
  station         text DEFAULT 'All',
  token           text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  used            boolean DEFAULT false,
  expires_at      timestamptz DEFAULT (now() + interval '48 hours'),
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Admins can create invites for their restaurant
CREATE POLICY "invites_insert_admin"
  ON public.invites FOR INSERT
  WITH CHECK (
    is_admin() AND
    restaurant_id = get_user_restaurant()
  );

-- Admins can see invites for their restaurant
CREATE POLICY "invites_read_admin"
  ON public.invites FOR SELECT
  USING (
    is_admin() AND
    restaurant_id = get_user_restaurant()
  );

-- Anyone can read a valid invite by token (for registration)
CREATE POLICY "invites_read_by_token"
  ON public.invites FOR SELECT
  USING (
    used = false AND
    expires_at > now()
  );


-- ── TEMPLATES ────────────────────────────────────────────────
CREATE TABLE public.templates (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_by      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name            text NOT NULL,
  color           text DEFAULT '#F97316',
  station         text DEFAULT 'All',
  is_shared       boolean DEFAULT false,
  items           jsonb DEFAULT '[]'::jsonb,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Read own templates
CREATE POLICY "templates_read_own"
  ON public.templates FOR SELECT
  USING (created_by = auth.uid());

-- Read shared templates within same restaurant
CREATE POLICY "templates_read_shared"
  ON public.templates FOR SELECT
  USING (
    is_shared = true AND
    restaurant_id = get_user_restaurant()
  );

-- Admins read all templates in restaurant
CREATE POLICY "templates_read_admin"
  ON public.templates FOR SELECT
  USING (
    is_admin() AND
    restaurant_id = get_user_restaurant()
  );

-- Create own templates
CREATE POLICY "templates_insert_own"
  ON public.templates FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    restaurant_id = get_user_restaurant()
  );

-- Update own templates
CREATE POLICY "templates_update_own"
  ON public.templates FOR UPDATE
  USING (created_by = auth.uid());

-- Admins can update any template in restaurant
CREATE POLICY "templates_update_admin"
  ON public.templates FOR UPDATE
  USING (
    is_admin() AND
    restaurant_id = get_user_restaurant()
  );

-- Delete own templates
CREATE POLICY "templates_delete_own"
  ON public.templates FOR DELETE
  USING (created_by = auth.uid());

-- Admins can delete any template in restaurant
CREATE POLICY "templates_delete_admin"
  ON public.templates FOR DELETE
  USING (
    is_admin() AND
    restaurant_id = get_user_restaurant()
  );


-- ── RECIPES ──────────────────────────────────────────────────
CREATE TABLE public.recipes (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_by      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name            text NOT NULL,
  station         text DEFAULT 'All',
  is_shared       boolean DEFAULT false,
  portions        integer DEFAULT 1,
  ingredients     jsonb DEFAULT '[]'::jsonb,
  steps           jsonb DEFAULT '[]'::jsonb,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Same pattern as templates
CREATE POLICY "recipes_read_own"
  ON public.recipes FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "recipes_read_shared"
  ON public.recipes FOR SELECT
  USING (
    is_shared = true AND
    restaurant_id = get_user_restaurant()
  );

CREATE POLICY "recipes_read_admin"
  ON public.recipes FOR SELECT
  USING (
    is_admin() AND
    restaurant_id = get_user_restaurant()
  );

CREATE POLICY "recipes_insert_own"
  ON public.recipes FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    restaurant_id = get_user_restaurant()
  );

CREATE POLICY "recipes_update_own"
  ON public.recipes FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "recipes_update_admin"
  ON public.recipes FOR UPDATE
  USING (
    is_admin() AND
    restaurant_id = get_user_restaurant()
  );

CREATE POLICY "recipes_delete_own"
  ON public.recipes FOR DELETE
  USING (created_by = auth.uid());

CREATE POLICY "recipes_delete_admin"
  ON public.recipes FOR DELETE
  USING (
    is_admin() AND
    restaurant_id = get_user_restaurant()
  );


-- ── DAILY REPORTS ────────────────────────────────────────────
CREATE TABLE public.daily_reports (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  restaurant_id   uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  date            date NOT NULL DEFAULT CURRENT_DATE,
  sections        jsonb DEFAULT '[]'::jsonb,   -- [{name, items: [{text, done}]}]
  next_shift      jsonb DEFAULT '[]'::jsonb,   -- [{text, station}]
  completed_pct   integer DEFAULT 0,
  completed_count integer DEFAULT 0,
  total_count     integer DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(user_id, date)   -- one report per user per day
);

ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

-- Cooks: only own reports
CREATE POLICY "reports_read_own"
  ON public.daily_reports FOR SELECT
  USING (user_id = auth.uid());

-- Admins: all reports in restaurant
CREATE POLICY "reports_read_admin"
  ON public.daily_reports FOR SELECT
  USING (
    is_admin() AND
    restaurant_id = get_user_restaurant()
  );

-- Cooks: insert/update own reports only
CREATE POLICY "reports_insert_own"
  ON public.daily_reports FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    restaurant_id = get_user_restaurant()
  );

CREATE POLICY "reports_update_own"
  ON public.daily_reports FOR UPDATE
  USING (user_id = auth.uid());

-- No deletes for reports (audit trail)
-- Admins can override if needed via service role


-- ── DEFERRED TASKS ───────────────────────────────────────────
-- Tasks carried from one shift to the next
CREATE TABLE public.deferred_tasks (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  restaurant_id   uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  text            text NOT NULL,
  station         text DEFAULT 'All',
  deferred_from   date NOT NULL DEFAULT CURRENT_DATE,
  carried         boolean DEFAULT false,  -- true = already moved to tomorrow's checklist
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.deferred_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deferred_own"
  ON public.deferred_tasks FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "deferred_admin"
  ON public.deferred_tasks FOR SELECT
  USING (
    is_admin() AND
    restaurant_id = get_user_restaurant()
  );


-- ── AUTO-UPDATED updated_at ──────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER templates_updated_at BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER recipes_updated_at BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── AUTO-CREATE PROFILE ON SIGNUP ────────────────────────────
-- Triggered by Supabase Auth when a new user registers via invite link
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  invite_record public.invites%ROWTYPE;
BEGIN
  -- Find valid invite by email
  SELECT * INTO invite_record
  FROM public.invites
  WHERE email = NEW.email
    AND used = false
    AND expires_at > now()
  LIMIT 1;

  IF invite_record.id IS NULL THEN
    -- No valid invite — block registration
    RAISE EXCEPTION 'No valid invite found for %', NEW.email;
  END IF;

  -- Create profile
  INSERT INTO public.profiles (id, restaurant_id, name, email, role, station)
  VALUES (
    NEW.id,
    invite_record.restaurant_id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    invite_record.role,
    invite_record.station
  );

  -- Mark invite as used
  UPDATE public.invites SET used = true WHERE id = invite_record.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ── INDEXES ──────────────────────────────────────────────────
CREATE INDEX idx_profiles_restaurant   ON public.profiles(restaurant_id);
CREATE INDEX idx_templates_restaurant  ON public.templates(restaurant_id);
CREATE INDEX idx_templates_created_by  ON public.templates(created_by);
CREATE INDEX idx_recipes_restaurant    ON public.recipes(restaurant_id);
CREATE INDEX idx_recipes_created_by    ON public.recipes(created_by);
CREATE INDEX idx_reports_user_date     ON public.daily_reports(user_id, date DESC);
CREATE INDEX idx_reports_restaurant    ON public.daily_reports(restaurant_id, date DESC);
CREATE INDEX idx_deferred_user         ON public.deferred_tasks(user_id, carried);


-- ── SEED: CREATE FIRST RESTAURANT + SUPERADMIN ───────────────
-- Run this manually after deploying schema, replacing values
-- INSERT INTO public.restaurants (name) VALUES ('La Brasserie') RETURNING id;
-- Then create a user via Supabase Auth Dashboard and set their role:
-- UPDATE public.profiles SET role = 'superadmin' WHERE id = '<your-auth-uid>';
