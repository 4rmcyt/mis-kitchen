-- View: completion % per station per date for the current restaurant
CREATE OR REPLACE VIEW station_velocity AS
SELECT
  restaurant_id,
  station,
  date,
  COUNT(*)                                          AS total,
  COUNT(*) FILTER (WHERE done = true)               AS done_count,
  ROUND(
    COUNT(*) FILTER (WHERE done = true) * 100.0
    / NULLIF(COUNT(*), 0)
  )::int                                            AS pct,
  EXTRACT(DOW FROM date)::int                       AS day_of_week
FROM tasks
WHERE station != 'Common'
GROUP BY restaurant_id, station, date;

GRANT SELECT ON station_velocity TO authenticated;
