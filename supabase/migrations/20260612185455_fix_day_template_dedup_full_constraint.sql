-- Replace partial unique index with a full unique constraint so PostgREST
-- can resolve ON CONFLICT by column list (partial indexes require a WHERE
-- predicate in the conflict target, which PostgREST cannot express).
-- NULL semantics are preserved: two ad-hoc rows with day_template_id=NULL
-- and identical other columns do NOT conflict (NULL != NULL in unique index).

DROP INDEX IF EXISTS public.tasks_day_template_dedup;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_day_template_dedup
  UNIQUE (restaurant_id, date, day_template_id, station, section, text);
