CREATE TABLE shifts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  date          date NOT NULL,
  station       text,
  start_time    time,
  end_time      time,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX shifts_restaurant_date ON shifts(restaurant_id, date);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own restaurant shifts"
  ON shifts FOR SELECT
  USING (restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "admin can manage shifts"
  ON shifts FOR ALL
  USING (
    restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
  )
  WITH CHECK (
    restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
  );
