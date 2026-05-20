-- Fix: functions with search_path='' must use fully qualified names (public.*)
-- is_admin() was calling get_user_role() without schema, causing "function does not exist" error

CREATE OR REPLACE FUNCTION public.get_user_restaurant()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT restaurant_id FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.get_user_role() IN ('admin', 'superadmin');
$$;

CREATE OR REPLACE FUNCTION public.update_last_seen()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles SET last_seen = now() WHERE id = auth.uid();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  invite_record public.invites%ROWTYPE;
BEGIN
  SELECT * INTO invite_record
  FROM public.invites
  WHERE used = false
    AND expires_at > now()
    AND (
      (email IS NOT NULL AND email = NEW.email)
      OR
      (email IS NULL AND token = (NEW.raw_user_meta_data->>'invite_token'))
    )
  ORDER BY created_at DESC
  LIMIT 1;

  IF invite_record.id IS NULL THEN
    RAISE EXCEPTION 'No valid invite found for %', NEW.email;
  END IF;

  INSERT INTO public.profiles (id, restaurant_id, name, email, role, station)
  VALUES (
    NEW.id,
    invite_record.restaurant_id,
    NEW.raw_user_meta_data->>'name',
    NEW.email,
    invite_record.role,
    invite_record.station
  );

  UPDATE public.invites SET used = true WHERE id = invite_record.id;

  RETURN NEW;
END;
$$;
