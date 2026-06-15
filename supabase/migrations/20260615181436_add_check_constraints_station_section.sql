ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_station_valid
    CHECK (station IN ('Common','Garmo','Rolls','Pans','Grill','Tandoor')),
  ADD CONSTRAINT tasks_section_valid
    CHECK (section IN ('Prep','Opening','Closing','Other'));

-- day_templates stores station/section inside JSONB entries — CHECK on JSONB is impractical; skipped intentionally.
