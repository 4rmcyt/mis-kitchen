CREATE TABLE improvement_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  author_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text          text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE improvement_logs ENABLE ROW LEVEL SECURITY;

-- All authenticated users of the same restaurant can read
CREATE POLICY "read own restaurant logs"
  ON improvement_logs FOR SELECT
  USING (
    restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
  );

-- Only admin/superadmin can insert
CREATE POLICY "admin can insert logs"
  ON improvement_logs FOR INSERT
  WITH CHECK (
    restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
  );

-- Only author can delete
CREATE POLICY "author can delete log"
  ON improvement_logs FOR DELETE
  USING (author_id = auth.uid());
