-- Fix push_subscriptions INSERT policy: also verify restaurant_id matches user's own restaurant
DROP POLICY IF EXISTS "users manage own subscriptions" ON public.push_subscriptions;

CREATE POLICY "users manage own subscriptions"
  ON public.push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND restaurant_id = (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid())
  );

-- Fix improvement_logs DELETE policy: also verify restaurant_id to prevent cross-restaurant deletes
DROP POLICY IF EXISTS "author can delete log" ON public.improvement_logs;

CREATE POLICY "author can delete log"
  ON public.improvement_logs
  FOR DELETE
  USING (
    author_id = auth.uid()
    AND restaurant_id = (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid())
  );
