-- ============================================================
-- MIS — Line Cook App
-- Supabase Schema + RLS Policies
-- ============================================================


-- ── RESTAURANTS ──────────────────────────────────────────────
CREATE TABLE public.restaurants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- ── PROFILES ────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id   uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name            text NOT NULL DEFAULT '',
  email           text UNIQUE,
  role            text NOT NULL DEFAULT 'cook'
                    CHECK (role IN ('cook', 'admin', 'superadmin')),
  station         text DEFAULT 'All',
  active          boolean DEFAULT true,
  last_seen       timestamptz DEFAULT now(),
  joined_at       timestamptz DEFAULT now()
);


-- ── HELPER FUNCTIONS ────────────────────────────────────────
-- Defined after profiles to avoid forward-reference errors.
-- search_path = '' prevents search_path injection.

CREATE OR REPLACE FUNCTION public.get_user_restaurant()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT restaurant_id FROM public.profiles
  WHERE id = (SELECT auth.uid())
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.profiles
  WHERE id = (SELECT auth.uid())
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.get_user_role() IN ('admin', 'superadmin');
$$;


-- ── RESTAURANTS RLS ──────────────────────────────────────────
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant_read_own"
  ON public.restaurants FOR SELECT
  TO authenticated
  USING (id = public.get_user_restaurant());


-- ── PROFILES RLS ────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Merged: own OR admin-in-restaurant (single SELECT policy)
CREATE POLICY "profiles_read"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR (public.is_admin() AND restaurant_id = public.get_user_restaurant())
  );

-- Merged: own OR admin-in-restaurant (single UPDATE policy)
CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR (public.is_admin() AND restaurant_id = public.get_user_restaurant())
  )
  WITH CHECK (
    id = (SELECT auth.uid())
    OR (public.is_admin() AND restaurant_id = public.get_user_restaurant())
  );

CREATE OR REPLACE FUNCTION public.update_last_seen()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles SET last_seen = now() WHERE id = (SELECT auth.uid());
  RETURN NEW;
END;
$$;


-- ── INVITES ──────────────────────────────────────────────────
CREATE TABLE public.invites (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  invited_by      uuid NOT NULL REFERENCES public.profiles(id),
  email           text NOT NULL,
  role            text NOT NULL DEFAULT 'cook'
                    CHECK (role IN ('cook', 'admin')),
  station         text DEFAULT 'All',
  token           text UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  used            boolean DEFAULT false,
  expires_at      timestamptz DEFAULT (now() + interval '48 hours'),
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invites_insert_admin"
  ON public.invites FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin() AND
    restaurant_id = public.get_user_restaurant()
  );

-- Merged: admin sees all in restaurant OR anyone can read valid invite by token
CREATE POLICY "invites_read"
  ON public.invites FOR SELECT
  USING (
    (used = false AND expires_at > now())
    OR (public.is_admin() AND restaurant_id = public.get_user_restaurant())
  );


-- ── TEMPLATES ────────────────────────────────────────────────
CREATE TABLE public.templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Merged: own OR shared-in-restaurant OR admin-in-restaurant
CREATE POLICY "templates_read"
  ON public.templates FOR SELECT
  TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR (is_shared = true AND restaurant_id = public.get_user_restaurant())
    OR (public.is_admin() AND restaurant_id = public.get_user_restaurant())
  );

CREATE POLICY "templates_insert"
  ON public.templates FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid()) AND
    restaurant_id = public.get_user_restaurant()
  );

-- Merged: own OR admin-in-restaurant
CREATE POLICY "templates_update"
  ON public.templates FOR UPDATE
  TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR (public.is_admin() AND restaurant_id = public.get_user_restaurant())
  );

-- Merged: own OR admin-in-restaurant
CREATE POLICY "templates_delete"
  ON public.templates FOR DELETE
  TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR (public.is_admin() AND restaurant_id = public.get_user_restaurant())
  );


-- ── RECIPES ──────────────────────────────────────────────────
CREATE TABLE public.recipes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE POLICY "recipes_read"
  ON public.recipes FOR SELECT
  TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR (is_shared = true AND restaurant_id = public.get_user_restaurant())
    OR (public.is_admin() AND restaurant_id = public.get_user_restaurant())
  );

CREATE POLICY "recipes_insert"
  ON public.recipes FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid()) AND
    restaurant_id = public.get_user_restaurant()
  );

CREATE POLICY "recipes_update"
  ON public.recipes FOR UPDATE
  TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR (public.is_admin() AND restaurant_id = public.get_user_restaurant())
  );

CREATE POLICY "recipes_delete"
  ON public.recipes FOR DELETE
  TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR (public.is_admin() AND restaurant_id = public.get_user_restaurant())
  );


-- ── DAILY REPORTS ────────────────────────────────────────────
CREATE TABLE public.daily_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  restaurant_id   uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  date            date NOT NULL DEFAULT CURRENT_DATE,
  sections        jsonb DEFAULT '[]'::jsonb,
  next_shift      jsonb DEFAULT '[]'::jsonb,
  completed_pct   integer DEFAULT 0,
  completed_count integer DEFAULT 0,
  total_count     integer DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

-- Merged: own OR admin-in-restaurant
CREATE POLICY "reports_read"
  ON public.daily_reports FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (public.is_admin() AND restaurant_id = public.get_user_restaurant())
  );

CREATE POLICY "reports_insert"
  ON public.daily_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid()) AND
    restaurant_id = public.get_user_restaurant()
  );

CREATE POLICY "reports_update"
  ON public.daily_reports FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));


-- ── DEFERRED TASKS ───────────────────────────────────────────
CREATE TABLE public.deferred_tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  restaurant_id   uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  text            text NOT NULL,
  station         text DEFAULT 'All',
  deferred_from   date NOT NULL DEFAULT CURRENT_DATE,
  carried         boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.deferred_tasks ENABLE ROW LEVEL SECURITY;

-- Merged: own (all ops) OR admin SELECT
CREATE POLICY "deferred_read"
  ON public.deferred_tasks FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (public.is_admin() AND restaurant_id = public.get_user_restaurant())
  );

CREATE POLICY "deferred_write"
  ON public.deferred_tasks FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()));


-- ── AUTO-UPDATED updated_at ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER templates_updated_at BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER recipes_updated_at BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── AUTO-CREATE PROFILE ON SIGNUP ────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  invite_record public.invites%ROWTYPE;
BEGIN
  SELECT * INTO invite_record
  FROM public.invites
  WHERE email = NEW.email
    AND used = false
    AND expires_at > now()
  LIMIT 1;

  IF invite_record.id IS NULL THEN
    RAISE EXCEPTION 'No valid invite found for %', NEW.email;
  END IF;

  INSERT INTO public.profiles (id, restaurant_id, name, email, role, station)
  VALUES (
    NEW.id,
    invite_record.restaurant_id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    invite_record.role,
    invite_record.station
  );

  UPDATE public.invites SET used = true WHERE id = invite_record.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── INDEXES ──────────────────────────────────────────────────
CREATE INDEX idx_profiles_restaurant   ON public.profiles(restaurant_id);
CREATE INDEX idx_templates_restaurant  ON public.templates(restaurant_id);
CREATE INDEX idx_templates_created_by  ON public.templates(created_by);
CREATE INDEX idx_recipes_restaurant    ON public.recipes(restaurant_id);
CREATE INDEX idx_recipes_created_by    ON public.recipes(created_by);
CREATE INDEX idx_reports_user_date     ON public.daily_reports(user_id, date DESC);
CREATE INDEX idx_reports_restaurant    ON public.daily_reports(restaurant_id, date DESC);
CREATE INDEX idx_deferred_user         ON public.deferred_tasks(user_id, carried);
CREATE INDEX idx_deferred_restaurant   ON public.deferred_tasks(restaurant_id);
CREATE INDEX idx_invites_restaurant    ON public.invites(restaurant_id);
CREATE INDEX idx_invites_invited_by    ON public.invites(invited_by);


-- ── FUNCTION EXECUTE GRANTS ──────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.get_user_restaurant() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_last_seen() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_restaurant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
