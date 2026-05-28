-- Fix push_subscriptions INSERT/UPDATE policy to verify restaurant_id matches caller's restaurant.
-- Previously only checked user_id = auth.uid(), allowing cross-restaurant subscription injection.

DROP POLICY IF EXISTS "users manage own subscriptions" ON public.push_subscriptions;

CREATE POLICY "users manage own subscriptions"
  ON public.push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND restaurant_id = (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid())
  );
