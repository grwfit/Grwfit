-- ─── Module 3: Member notes, freeze history, import jobs ────────────────────

-- Enable RLS on new tables
ALTER TABLE member_notes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_freeze_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_import_jobs   ENABLE ROW LEVEL SECURITY;

-- Gym-level isolation for member_notes
CREATE POLICY member_notes_isolation ON member_notes
  USING (gym_id::text = current_setting('app.current_gym_id', true));

-- Gym-level isolation for member_freeze_history
CREATE POLICY member_freeze_history_isolation ON member_freeze_history
  USING (gym_id::text = current_setting('app.current_gym_id', true));

-- Gym-level isolation for member_import_jobs
CREATE POLICY member_import_jobs_isolation ON member_import_jobs
  USING (gym_id::text = current_setting('app.current_gym_id', true));

-- Trigram index for fuzzy search on members
CREATE INDEX IF NOT EXISTS members_name_trgm_idx
  ON members USING gin(name gin_trgm_ops);

-- Trigram index for phone search
CREATE INDEX IF NOT EXISTS members_phone_idx
  ON members(gym_id, phone);
