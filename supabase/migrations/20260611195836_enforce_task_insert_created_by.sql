CREATE OR REPLACE FUNCTION public.enforce_task_insert_done_by()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF public.is_admin() THEN RETURN NEW; END IF;
  -- Non-admins may not attribute a completed task to another user.
  IF NEW.done_by IS NOT NULL AND NEW.done_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'permission denied: done_by must be your own user id';
  END IF;
  -- If inserting a pre-completed task, force attribution to self.
  IF NEW.done = true AND NEW.done_by IS NULL THEN
    NEW.done_by := auth.uid();
  END IF;
  -- Non-admins may not forge the audit trail by supplying a foreign created_by.
  IF NEW.created_by IS DISTINCT FROM auth.uid() THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;
