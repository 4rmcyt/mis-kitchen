-- Add shift experiment fields to restaurants table
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS shift_experiment text;

-- Add experiment_outcome to daily_reports
-- outcome: null = not submitted, 'yes' | 'no' | 'not_tried'
ALTER TABLE daily_reports
  ADD COLUMN IF NOT EXISTS experiment_text text,
  ADD COLUMN IF NOT EXISTS experiment_outcome text,
  ADD COLUMN IF NOT EXISTS experiment_note text;
