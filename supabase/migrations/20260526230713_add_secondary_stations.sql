ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS secondary_stations text[] NOT NULL DEFAULT '{}';
