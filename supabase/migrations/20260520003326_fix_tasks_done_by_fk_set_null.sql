
ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_done_by_fkey,
  ADD CONSTRAINT tasks_done_by_fkey
    FOREIGN KEY (done_by) REFERENCES profiles(id) ON DELETE SET NULL;
