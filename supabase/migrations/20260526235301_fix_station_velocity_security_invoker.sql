DROP VIEW IF EXISTS public.station_velocity;

CREATE VIEW public.station_velocity
  WITH (security_invoker = true)
AS
SELECT
  t.station,
  EXTRACT(DOW FROM t.done_at) AS dow,
  COUNT(*) AS completed_count
FROM tasks t
WHERE t.done_at IS NOT NULL
GROUP BY t.station, dow;

GRANT SELECT ON public.station_velocity TO authenticated;
