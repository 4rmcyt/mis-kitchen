ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_set boolean NOT NULL DEFAULT false;
