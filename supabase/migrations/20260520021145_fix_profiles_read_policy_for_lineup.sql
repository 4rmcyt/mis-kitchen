DROP POLICY IF EXISTS "profiles_read" ON public.profiles;

CREATE POLICY "profiles_read" ON public.profiles FOR SELECT TO authenticated
  USING (
    restaurant_id = public.get_user_restaurant()
  );
