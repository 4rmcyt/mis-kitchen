-- Drop period-text variant; replace with explicit date range.
-- SECURITY DEFINER: bypasses RLS to allow history > ±3 days for cooks.
-- Role logic derived from JWT inside the function — never from arguments.
-- Cook: done_by = auth.uid() only. Admin: all people in restaurant.
DROP FUNCTION IF EXISTS public.get_prep_stats(text);

CREATE OR REPLACE FUNCTION public.get_prep_stats(p_start date, p_end date)
RETURNS TABLE (
  done_by_id     uuid,
  done_by_name   text,
  prep_item_id   uuid,
  prep_item_name text,
  cnt            bigint,
  qty_sum        bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid           uuid;
  v_restaurant_id uuid;
  v_is_admin      boolean;
BEGIN
  v_uid           := auth.uid();
  v_restaurant_id := public.get_user_restaurant();
  v_is_admin      := public.is_admin();

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'permission denied: authentication required';
  END IF;

  RETURN QUERY
  SELECT
    t.done_by                              AS done_by_id,
    p.name                                 AS done_by_name,
    t.prep_item_id                         AS prep_item_id,
    pi.name                                AS prep_item_name,
    COUNT(*)::bigint                       AS cnt,
    COALESCE(SUM(t.quantity), 0)::bigint   AS qty_sum
  FROM public.tasks t
  JOIN public.profiles   p  ON p.id  = t.done_by
  JOIN public.prep_items pi ON pi.id = t.prep_item_id
  WHERE
    t.restaurant_id  = v_restaurant_id
    AND t.done       = true
    AND t.prep_item_id IS NOT NULL
    AND t.done_by      IS NOT NULL
    AND t.date BETWEEN p_start AND p_end
    AND (v_is_admin OR t.done_by = v_uid)
  GROUP BY t.done_by, p.name, t.prep_item_id, pi.name
  ORDER BY cnt DESC, pi.name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_prep_stats(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_prep_stats(date, date) TO authenticated;
