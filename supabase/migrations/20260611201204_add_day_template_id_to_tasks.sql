ALTER TABLE public.tasks
  ADD COLUMN day_template_id uuid NULL REFERENCES public.day_templates(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX tasks_day_template_dedup
  ON public.tasks (restaurant_id, date, day_template_id, station, section, text)
  WHERE day_template_id IS NOT NULL;
