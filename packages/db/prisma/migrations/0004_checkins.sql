-- ─── Module 4: Check-ins table, RLS, indexes ─────────────────────────────────

-- Enable RLS
ALTER TABLE checkins               ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_checkin_settings   ENABLE ROW LEVEL SECURITY;

-- Isolation policies
CREATE POLICY checkins_isolation ON checkins
  USING (gym_id::text = current_setting('app.current_gym_id', true));

CREATE POLICY gym_checkin_settings_isolation ON gym_checkin_settings
  USING (gym_id::text = current_setting('app.current_gym_id', true));

-- Performance index: by gym and timestamp descending
CREATE INDEX IF NOT EXISTS checkins_gym_date_idx
  ON checkins (gym_id, checked_in_at DESC);

-- Index for member lookup
CREATE INDEX IF NOT EXISTS checkins_gym_member_idx
  ON checkins (gym_id, member_id, checked_in_at DESC);

-- ─── Partition strategy (production note) ────────────────────────────────────
-- For >10M rows, convert to partitioned table:
--
-- CREATE TABLE checkins_partitioned (LIKE checkins INCLUDING ALL)
--   PARTITION BY RANGE (checked_in_at);
--
-- CREATE TABLE checkins_2024_01 PARTITION OF checkins_partitioned
--   FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
-- ... and so on monthly, created by a cron job
--
-- Prisma accesses via the parent table name, no code changes needed.
-- Defer to ops team when table reaches 5M rows.

-- Insert default check-in settings for any existing gyms
INSERT INTO gym_checkin_settings (gym_id, allow_expired, notify_whatsapp)
SELECT id, true, false FROM gyms
ON CONFLICT (gym_id) DO NOTHING;
