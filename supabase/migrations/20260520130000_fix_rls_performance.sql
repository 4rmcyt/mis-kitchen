-- Fix 1: auth_rls_initplan — wrap auth.uid() in SELECT to prevent per-row re-evaluation
-- Fix 2: multiple_permissive_policies — merge duplicate SELECT policies into one

-- ── clock_events ──────────────────────────────────────────────
DROP POLICY IF EXISTS "clock_events_own" ON public.clock_events;
DROP POLICY IF EXISTS "clock_events_admin" ON public.clock_events;
DROP POLICY IF EXISTS "clock_events_insert" ON public.clock_events;
DROP POLICY IF EXISTS "clock_events_update" ON public.clock_events;
DROP POLICY IF EXISTS "clock_events_delete" ON public.clock_events;

CREATE POLICY "clock_events_select" ON public.clock_events FOR SELECT TO authenticated
  USING (
    (user_id = (SELECT auth.uid()))
    OR (public.is_admin() AND restaurant_id = public.get_user_restaurant())
  );

CREATE POLICY "clock_events_insert" ON public.clock_events FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = (SELECT auth.uid())) AND (restaurant_id = public.get_user_restaurant())
  );

CREATE POLICY "clock_events_update" ON public.clock_events FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    (user_id = (SELECT auth.uid())) AND (restaurant_id = public.get_user_restaurant())
  );

CREATE POLICY "clock_events_delete" ON public.clock_events FOR DELETE TO authenticated
  USING (
    (user_id = (SELECT auth.uid()))
    OR (public.is_admin() AND restaurant_id = public.get_user_restaurant())
  );

-- ── deferred_tasks ────────────────────────────────────────────
DROP POLICY IF EXISTS "deferred_own" ON public.deferred_tasks;
DROP POLICY IF EXISTS "deferred_admin_read" ON public.deferred_tasks;

CREATE POLICY "deferred_select" ON public.deferred_tasks FOR SELECT TO authenticated
  USING (
    (user_id = (SELECT auth.uid()))
    OR (public.is_admin() AND restaurant_id = public.get_user_restaurant())
  );

CREATE POLICY "deferred_insert" ON public.deferred_tasks FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = (SELECT auth.uid())) AND (restaurant_id = public.get_user_restaurant())
  );

CREATE POLICY "deferred_update" ON public.deferred_tasks FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    (user_id = (SELECT auth.uid())) AND (restaurant_id = public.get_user_restaurant())
  );

CREATE POLICY "deferred_delete" ON public.deferred_tasks FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ── push_shifts ───────────────────────────────────────────────
DROP POLICY IF EXISTS "shifts_read_own" ON public.push_shifts;
DROP POLICY IF EXISTS "shifts_read_admin" ON public.push_shifts;

CREATE POLICY "shifts_select" ON public.push_shifts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.push_employee_id = push_shifts.push_employee_id
        AND (
          p.id = (SELECT auth.uid())
          OR (p.restaurant_id = public.get_user_restaurant() AND public.is_admin())
        )
    )
  );

-- ── daily_reports ─────────────────────────────────────────────
DROP POLICY IF EXISTS "reports_update" ON public.daily_reports;
DROP POLICY IF EXISTS "reports_delete" ON public.daily_reports;

CREATE POLICY "reports_update" ON public.daily_reports FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    (user_id = (SELECT auth.uid())) AND (restaurant_id = public.get_user_restaurant())
  );

CREATE POLICY "reports_delete" ON public.daily_reports FOR DELETE TO authenticated
  USING (
    (user_id = (SELECT auth.uid()))
    OR (public.is_admin() AND restaurant_id = public.get_user_restaurant())
  );

-- ── day_templates ─────────────────────────────────────────────
DROP POLICY IF EXISTS "restaurant members can read day_templates" ON public.day_templates;
DROP POLICY IF EXISTS "admins can manage day_templates" ON public.day_templates;

CREATE POLICY "day_templates_select" ON public.day_templates FOR SELECT TO authenticated
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles WHERE id = (SELECT auth.uid())
    )
  );

CREATE POLICY "day_templates_admin_write" ON public.day_templates FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND restaurant_id = day_templates.restaurant_id
        AND role = ANY (ARRAY['admin', 'superadmin'])
    )
  );

-- ── tasks ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "cooks can read relevant tasks" ON public.tasks;
DROP POLICY IF EXISTS "admins can read all tasks" ON public.tasks;
DROP POLICY IF EXISTS "members can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "cooks can update task completion and comment" ON public.tasks;
DROP POLICY IF EXISTS "admins can delete tasks" ON public.tasks;

CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND restaurant_id = tasks.restaurant_id
        AND (
          role = ANY (ARRAY['admin', 'superadmin'])
          OR (date >= CURRENT_DATE - 3 AND date <= CURRENT_DATE + 3)
        )
    )
  );
-- Note: admins match first condition (role check) so date filter only applies to cooks

CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles WHERE id = (SELECT auth.uid())
    )
  );

CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE TO authenticated
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles WHERE id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles WHERE id = (SELECT auth.uid())
    )
  );

CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND restaurant_id = tasks.restaurant_id
        AND role = ANY (ARRAY['admin', 'superadmin'])
    )
  );
