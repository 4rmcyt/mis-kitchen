ALTER TABLE public.tasks
  ADD COLUMN assigned_to uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL;
