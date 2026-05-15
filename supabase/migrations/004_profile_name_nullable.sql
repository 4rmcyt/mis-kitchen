-- Allow name to be NULL so onboarding flow can detect new users
ALTER TABLE public.profiles ALTER COLUMN name DROP NOT NULL;

-- Trigger no longer pre-fills name from email — onboarding collects it instead
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  invite_record public.invites%ROWTYPE;
BEGIN
  SELECT * INTO invite_record
  FROM public.invites
  WHERE email = NEW.email
    AND used = false
    AND expires_at > now()
  LIMIT 1;

  IF invite_record.id IS NULL THEN
    RAISE EXCEPTION 'No valid invite found for %', NEW.email;
  END IF;

  INSERT INTO public.profiles (id, restaurant_id, name, email, role, station)
  VALUES (
    NEW.id,
    invite_record.restaurant_id,
    NULL,
    NEW.email,
    invite_record.role,
    invite_record.station
  );

  UPDATE public.invites SET used = true WHERE id = invite_record.id;

  RETURN NEW;
END;
$$;
