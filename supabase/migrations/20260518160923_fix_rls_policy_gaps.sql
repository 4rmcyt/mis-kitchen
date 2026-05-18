-- clock_events: add INSERT, UPDATE, DELETE
CREATE POLICY clock_events_insert ON public.clock_events
  FOR INSERT WITH CHECK (user_id = auth.uid() AND restaurant_id = get_user_restaurant());

CREATE POLICY clock_events_update ON public.clock_events
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND restaurant_id = get_user_restaurant());

CREATE POLICY clock_events_delete ON public.clock_events
  FOR DELETE USING (user_id = auth.uid() OR (is_admin() AND restaurant_id = get_user_restaurant()));

-- deferred_tasks: fix ALL policy to add with_check, drop redundant deferred_read
DROP POLICY deferred_write ON public.deferred_tasks;
DROP POLICY deferred_read ON public.deferred_tasks;

CREATE POLICY deferred_own ON public.deferred_tasks
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND restaurant_id = get_user_restaurant());

CREATE POLICY deferred_admin_read ON public.deferred_tasks
  FOR SELECT USING (is_admin() AND restaurant_id = get_user_restaurant());

-- daily_reports: add DELETE, fix UPDATE with_check
DROP POLICY reports_update ON public.daily_reports;

CREATE POLICY reports_update ON public.daily_reports
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND restaurant_id = get_user_restaurant());

CREATE POLICY reports_delete ON public.daily_reports
  FOR DELETE USING (user_id = auth.uid() OR (is_admin() AND restaurant_id = get_user_restaurant()));

-- invites: add DELETE and UPDATE for admin
CREATE POLICY invites_update_admin ON public.invites
  FOR UPDATE USING (is_admin() AND restaurant_id = get_user_restaurant())
  WITH CHECK (is_admin() AND restaurant_id = get_user_restaurant());

CREATE POLICY invites_delete_admin ON public.invites
  FOR DELETE USING (is_admin() AND restaurant_id = get_user_restaurant());
