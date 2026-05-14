-- ─── Row-Level Security Setup — GrwFit ───────────────────────────────────────
-- Run this AFTER Prisma migrations to enable multi-tenant RLS

-- 1. Create a dedicated role for super-admin (bypasses RLS)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'grwfit_admin') THEN
    CREATE ROLE grwfit_admin;
  END IF;
END $$;

-- Grant grwfit_admin the ability to bypass RLS
ALTER ROLE grwfit_admin BYPASSRLS;

-- 2. Enable RLS on all tenant tables
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for each table
-- Pattern: gym_id must match app.current_gym_id from JWT context

-- gyms: accessible by their own gym_id
CREATE POLICY gyms_isolation ON gyms
  USING (id::text = current_setting('app.current_gym_id', true));

-- branches: gym_id isolation
CREATE POLICY branches_isolation ON branches
  USING (gym_id::text = current_setting('app.current_gym_id', true));

-- staff_users: gym_id isolation
CREATE POLICY staff_users_isolation ON staff_users
  USING (gym_id::text = current_setting('app.current_gym_id', true));

-- members: gym_id isolation
CREATE POLICY members_isolation ON members
  USING (gym_id::text = current_setting('app.current_gym_id', true));

-- auth_otps: gym_id isolation (nullable gym_id for platform-level otps)
CREATE POLICY auth_otps_isolation ON auth_otps
  USING (
    gym_id IS NULL OR
    gym_id::text = current_setting('app.current_gym_id', true)
  );

-- refresh_tokens: gym_id isolation
CREATE POLICY refresh_tokens_isolation ON refresh_tokens
  USING (
    gym_id IS NULL OR
    gym_id::text = current_setting('app.current_gym_id', true)
  );

-- login_history: gym_id isolation
CREATE POLICY login_history_isolation ON login_history
  USING (
    gym_id IS NULL OR
    gym_id::text = current_setting('app.current_gym_id', true)
  );

-- audit_log: gym_id isolation
CREATE POLICY audit_log_isolation ON audit_log
  USING (
    gym_id IS NULL OR
    gym_id::text = current_setting('app.current_gym_id', true)
  );

-- 4. platform_users has NO RLS (platform-only table, separate auth)
-- Access controlled via application-level role check only

-- 5. Trainer-scoped member access (additional policy layered on top)
-- Trainers only see members assigned to them
-- This is enforced at application level via @RequiresPermission decorator
-- and the assignedTrainerId filter in the member service

-- 6. Verify RLS is active
DO $$
DECLARE
  tbl RECORD;
  rls_missing TEXT := '';
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('platform_users', '_prisma_migrations')
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = tbl.tablename
        AND n.nspname = 'public'
        AND c.relrowsecurity = true
    ) THEN
      rls_missing := rls_missing || tbl.tablename || ', ';
    END IF;
  END LOOP;

  IF rls_missing <> '' THEN
    RAISE WARNING 'RLS not enabled on: %', rls_missing;
  ELSE
    RAISE NOTICE '✓ RLS verified on all tenant tables';
  END IF;
END $$;
