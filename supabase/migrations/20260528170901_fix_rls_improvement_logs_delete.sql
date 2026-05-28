-- Fix improvement_logs DELETE policy to also check restaurant_id.
-- Previously only checked author_id = auth.uid(), allowing cross-restaurant deletion
-- if a user authored logs before being transferred to another restaurant.

DROP POLICY IF EXISTS "author can delete log" ON public.improvement_logs;

CREATE POLICY "author can delete log"
  ON public.improvement_logs
  FOR DELETE
  USING (
    author_id = auth.uid()
    AND restaurant_id = (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid())
  );
