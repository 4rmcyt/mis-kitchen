-- INSERT trigger: cooks may not pre-assign tasks.
-- Admin early-return handles lead/admin assignment.
-- NULL uid (service role) early-return handles idempotent generation.
CREATE OR REPLACE FUNCTION public.enforce_task_insert_done_by()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF public.is_admin() THEN RETURN NEW; END IF;

  -- Service-role / system inserts (no JWT): trust as-is, skip ownership forcing.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Non-admins may not attribute a completed task to another user.
  IF NEW.done_by IS NOT NULL AND NEW.done_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'permission denied: done_by must be your own user id';
  END IF;
  -- If inserting a pre-completed task, force attribution to self.
  IF NEW.done = true AND NEW.done_by IS NULL THEN
    NEW.done_by := auth.uid();
  END IF;

  -- Authenticated non-admins may not forge created_by (reject, consistent with done_by).
  IF NEW.created_by IS NOT NULL AND NEW.created_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'permission denied: created_by must be your own user id';
  END IF;
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  -- Only a lead/admin may pre-assign a task. Cooks insert unassigned.
  -- (Template generation runs under a cook JWT and leaves assigned_to NULL → passes.)
  IF NEW.assigned_to IS NOT NULL THEN
    RAISE EXCEPTION 'permission denied: only a lead may assign tasks';
  END IF;

  RETURN NEW;
END;
$$;

-- UPDATE trigger: add assigned_to to the read-only column set for cooks.
-- Also add NULL-uid early-return (service-role path, consistent with INSERT trigger).
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

  -- Service-role / system updates (no JWT): trust as-is.
  IF auth.uid() IS NULL THEN
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
    NEW.created_by    IS DISTINCT FROM OLD.created_by    OR
    NEW.assigned_to   IS DISTINCT FROM OLD.assigned_to
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
