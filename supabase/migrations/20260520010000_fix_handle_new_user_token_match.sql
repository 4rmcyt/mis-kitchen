CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;
