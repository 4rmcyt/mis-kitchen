-- Create default restaurant and link all existing profiles
DO $$
DECLARE
  restaurant_uuid uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.restaurants (id, name)
  VALUES (restaurant_uuid, 'Sample Restaurant');

  UPDATE public.profiles
  SET restaurant_id = restaurant_uuid
  WHERE restaurant_id IS NULL;
END $$;
