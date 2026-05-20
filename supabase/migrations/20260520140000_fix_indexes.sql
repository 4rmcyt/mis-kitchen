-- Add missing indexes on foreign keys
CREATE INDEX IF NOT EXISTS idx_clock_events_restaurant_id ON public.clock_events(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_day_templates_created_by ON public.day_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_deferred_tasks_restaurant_id ON public.deferred_tasks(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_invites_restaurant_id ON public.invites(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_done_by ON public.tasks(done_by);
CREATE INDEX IF NOT EXISTS idx_tasks_template_id ON public.tasks(template_id);

-- Drop unused indexes
DROP INDEX IF EXISTS public.idx_profiles_push_employee;
DROP INDEX IF EXISTS public.idx_profiles_on_shift;
DROP INDEX IF EXISTS public.idx_push_shifts_date;
DROP INDEX IF EXISTS public.idx_webhook_log_event;
