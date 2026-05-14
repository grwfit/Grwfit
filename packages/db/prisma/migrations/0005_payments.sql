-- ─── Module 5: Payments, Plans, Invoices, Refunds ────────────────────────────

-- Enable RLS
ALTER TABLE membership_plans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_sequences     ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds               ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_reconciliation   ENABLE ROW LEVEL SECURITY;

-- Isolation policies
CREATE POLICY membership_plans_isolation ON membership_plans
  USING (gym_id::text = current_setting('app.current_gym_id', true));

CREATE POLICY invoice_sequences_isolation ON invoice_sequences
  USING (gym_id::text = current_setting('app.current_gym_id', true));

CREATE POLICY payments_isolation ON payments
  USING (gym_id::text = current_setting('app.current_gym_id', true));

CREATE POLICY refunds_isolation ON refunds
  USING (gym_id::text = current_setting('app.current_gym_id', true));

CREATE POLICY cash_reconciliation_isolation ON cash_reconciliation
  USING (gym_id::text = current_setting('app.current_gym_id', true));

-- Revenue index for reports (UTC-based, converted at query time)
CREATE INDEX IF NOT EXISTS payments_gym_paid_idx
  ON payments (gym_id, paid_at DESC);

-- Seed demo plans for the existing demo gym
DO $$
DECLARE
  v_gym_id UUID;
BEGIN
  SELECT id INTO v_gym_id FROM gyms WHERE slug = 'iron-forge' LIMIT 1;
  IF v_gym_id IS NOT NULL THEN
    INSERT INTO membership_plans (gym_id, name, description, price_paise, duration_days, is_active, updated_at)
    VALUES
      (v_gym_id, 'Monthly',   '1 month membership',   150000, 30,  true, now()),
      (v_gym_id, 'Quarterly', '3 month membership',   400000, 90,  true, now()),
      (v_gym_id, 'Annual',    '12 month membership', 1200000, 365, true, now())
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
