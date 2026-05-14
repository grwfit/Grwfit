-- ─── RLS Policies for Modules 7–16 tables ────────────────────────────────────
-- Run after prisma db push so all tables exist

-- Enable RLS
ALTER TABLE whatsapp_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_optouts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_trigger_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_campaigns    ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_stages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities        ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE diet_plans             ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE websites               ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_analytics      ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_instances        ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_bookings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_waitlist         ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_class_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress    ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents               ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;
-- member_notes, member_freeze_history, member_import_jobs: already handled in 0003_member_tables.sql

-- Isolation policies (all use the same pattern)
CREATE POLICY whatsapp_messages_isolation      ON whatsapp_messages      USING (gym_id::text = current_setting('app.current_gym_id', true));
CREATE POLICY whatsapp_optouts_isolation       ON whatsapp_optouts       USING (gym_id::text = current_setting('app.current_gym_id', true));
CREATE POLICY whatsapp_trigger_rules_isolation ON whatsapp_trigger_rules USING (gym_id::text = current_setting('app.current_gym_id', true));
CREATE POLICY broadcast_campaigns_isolation    ON broadcast_campaigns    USING (gym_id::text = current_setting('app.current_gym_id', true));
CREATE POLICY lead_stages_isolation            ON lead_stages            USING (gym_id::text = current_setting('app.current_gym_id', true));
CREATE POLICY leads_isolation                  ON leads                  USING (gym_id::text = current_setting('app.current_gym_id', true));
CREATE POLICY lead_activities_isolation        ON lead_activities        USING (gym_id::text = current_setting('app.current_gym_id', true));
CREATE POLICY workout_templates_isolation      ON workout_templates      USING (gym_id::text = current_setting('app.current_gym_id', true));
CREATE POLICY workout_plans_isolation          ON workout_plans          USING (gym_id::text = current_setting('app.current_gym_id', true));
CREATE POLICY diet_plans_isolation             ON diet_plans             USING (gym_id::text = current_setting('app.current_gym_id', true));
CREATE POLICY progress_logs_isolation          ON progress_logs          USING (gym_id::text = current_setting('app.current_gym_id', true));
CREATE POLICY commissions_isolation            ON commissions            USING (gym_id::text = current_setting('app.current_gym_id', true));
CREATE POLICY websites_isolation               ON websites               USING (gym_id::text = current_setting('app.current_gym_id', true));
CREATE POLICY website_analytics_isolation      ON website_analytics      USING (gym_id::text = current_setting('app.current_gym_id', true));
CREATE POLICY class_templates_isolation        ON class_templates        USING (gym_id::text = current_setting('app.current_gym_id', true));
CREATE POLICY class_instances_isolation        ON class_instances        USING (gym_id::text = current_setting('app.current_gym_id', true));
CREATE POLICY class_bookings_isolation         ON class_bookings         USING (gym_id::text = current_setting('app.current_gym_id', true));
CREATE POLICY class_waitlist_isolation         ON class_waitlist         USING (gym_id::text = current_setting('app.current_gym_id', true));
CREATE POLICY gym_class_settings_isolation     ON gym_class_settings     USING (gym_id::text = current_setting('app.current_gym_id', true));
CREATE POLICY onboarding_progress_isolation    ON onboarding_progress    USING (gym_id::text = current_setting('app.current_gym_id', true));
CREATE POLICY platform_subscriptions_isolation ON platform_subscriptions USING (gym_id::text = current_setting('app.current_gym_id', true));
CREATE POLICY consents_isolation               ON consents               USING (gym_id::text = current_setting('app.current_gym_id', true));
CREATE POLICY data_export_requests_isolation   ON data_export_requests   USING (gym_id::text = current_setting('app.current_gym_id', true));
CREATE POLICY data_deletion_requests_isolation ON data_deletion_requests USING (gym_id::text = current_setting('app.current_gym_id', true));
-- member_notes, member_freeze_history, member_import_jobs: policies already in 0003_member_tables.sql

-- platform_users: NO RLS — platform-only table, access controlled at application level

-- Verify RLS coverage
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
    RAISE NOTICE 'RLS verified on all tenant tables';
  END IF;
END $$;
