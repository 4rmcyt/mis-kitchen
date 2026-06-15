-- Fix two issues introduced in add_prep_items_and_task_fields:
-- 1. Restore assigned_to to the read-only column list (was accidentally dropped).
-- 2. Change auth.uid() IS NULL from RAISE to RETURN NEW (service-role path must pass through,
--    consistent with enforce_task_insert_done_by).
CREATE OR REPLACE FUNCTION public.enforce_task_update_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Admins may change any column
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Service-role / unauthenticated server path: allow through
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Reject changes to read-only columns
  IF (
    NEW.text          IS DISTINCT FROM OLD.text          OR
    NEW.station       IS DISTINCT FROM OLD.station       OR
    NEW.section       IS DISTINCT FROM OLD.section       OR
    NEW.date          IS DISTINCT FROM OLD.date          OR
    NEW.source        IS DISTINCT FROM OLD.source        OR
    NEW.template_id   IS DISTINCT FROM OLD.template_id   OR
    NEW.restaurant_id IS DISTINCT FROM OLD.restaurant_id OR
    NEW.created_by    IS DISTINCT FROM OLD.created_by    OR
    NEW.assigned_to   IS DISTINCT FROM OLD.assigned_to   OR
    NEW.prep_item_id  IS DISTINCT FROM OLD.prep_item_id
  ) THEN
    RAISE EXCEPTION 'permission denied: cooks may only update done, done_at, done_by, comment, and quantity';
  END IF;

  -- quantity: editable only while task is open
  IF NEW.quantity IS DISTINCT FROM OLD.quantity AND OLD.done = true THEN
    RAISE EXCEPTION 'permission denied: quantity cannot be changed after task is done';
  END IF;

  -- done_by must be caller's uid
  IF NEW.done_by IS NOT NULL AND NEW.done_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'permission denied: done_by must be your own user id';
  END IF;

  RETURN NEW;
END;
$$;
