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
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER enforce_task_insert_done_by
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_task_insert_done_by();
