-- Enforce column-level restrictions on task updates for non-admin users.
-- The existing tasks_update RLS policy handles restaurant scoping.
-- This trigger adds: cooks may only change done/done_at/done_by/comment,
-- and done_by must equal auth.uid() (or NULL).

CREATE OR REPLACE FUNCTION public.enforce_task_update_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Admins and superadmins may change any column
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Reject if any read-only column was changed
  IF (
    NEW.text          IS DISTINCT FROM OLD.text          OR
    NEW.station       IS DISTINCT FROM OLD.station       OR
    NEW.section       IS DISTINCT FROM OLD.section       OR
    NEW.date          IS DISTINCT FROM OLD.date          OR
    NEW.source        IS DISTINCT FROM OLD.source        OR
    NEW.template_id   IS DISTINCT FROM OLD.template_id   OR
    NEW.restaurant_id IS DISTINCT FROM OLD.restaurant_id OR
    NEW.created_by    IS DISTINCT FROM OLD.created_by
  ) THEN
    RAISE EXCEPTION 'permission denied: cooks may only update done, done_at, done_by, and comment';
  END IF;

  -- Force done_by to the caller's uid (or NULL) — prevents attributing completions to others
  IF NEW.done_by IS NOT NULL AND NEW.done_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'permission denied: done_by must be your own user id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER enforce_task_update_columns
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_task_update_columns();
