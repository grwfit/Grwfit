-- ─── Module 6: Renewals — templates, configs, reminders, follow-ups ─────────

-- Enable RLS
ALTER TABLE whatsapp_templates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_renewal_configs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewal_reminders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewal_follow_ups    ENABLE ROW LEVEL SECURITY;

-- Isolation policies
CREATE POLICY whatsapp_templates_isolation ON whatsapp_templates
  USING (gym_id::text = current_setting('app.current_gym_id', true));

CREATE POLICY gym_renewal_configs_isolation ON gym_renewal_configs
  USING (gym_id::text = current_setting('app.current_gym_id', true));

CREATE POLICY renewal_reminders_isolation ON renewal_reminders
  USING (gym_id::text = current_setting('app.current_gym_id', true));

CREATE POLICY renewal_follow_ups_isolation ON renewal_follow_ups
  USING (gym_id::text = current_setting('app.current_gym_id', true));

-- Expiry-window index for dashboard bucketing (most critical query)
CREATE INDEX IF NOT EXISTS members_gym_expiry_status_idx
  ON members (gym_id, expires_at, status)
  WHERE deleted_at IS NULL;

-- Seed default renewal configs + templates for existing gyms
DO $$
DECLARE
  v_gym_id UUID;
  v_tpl_7d UUID;
  v_tpl_3d UUID;
  v_tpl_1d UUID;
  v_tpl_exp UUID;
  v_tpl_7a UUID;
BEGIN
  FOR v_gym_id IN SELECT id FROM gyms LOOP

    -- Insert default templates
    INSERT INTO whatsapp_templates (gym_id, name, body, status, category, updated_at)
    VALUES
      (v_gym_id, 'renewal_7d', 'Hi {{1}}, your membership at {{2}} expires in 7 days on {{3}}. Renew now to keep your streak going!', 'approved', 'UTILITY', now()),
      (v_gym_id, 'renewal_3d', 'Hi {{1}}, only 3 days left on your membership at {{2}} (expires {{3}}). Renew today and get 10% off!', 'approved', 'MARKETING', now()),
      (v_gym_id, 'renewal_1d', 'Hi {{1}}, your membership expires TOMORROW! Visit {{2}} today or call us to renew. Don''t lose your progress!', 'approved', 'UTILITY', now()),
      (v_gym_id, 'renewal_expired', 'Hi {{1}}, we miss you at {{2}}! Your membership expired on {{3}}. Come back and we''ll help you pick up where you left off.', 'approved', 'MARKETING', now()),
      (v_gym_id, 'renewal_final', 'Hi {{1}}, last chance to rejoin {{2}} before we close your account. Reply YES to renew.', 'approved', 'MARKETING', now())
    ON CONFLICT DO NOTHING;

    -- Fetch template IDs
    SELECT id INTO v_tpl_7d  FROM whatsapp_templates WHERE gym_id = v_gym_id AND name = 'renewal_7d'  LIMIT 1;
    SELECT id INTO v_tpl_3d  FROM whatsapp_templates WHERE gym_id = v_gym_id AND name = 'renewal_3d'  LIMIT 1;
    SELECT id INTO v_tpl_1d  FROM whatsapp_templates WHERE gym_id = v_gym_id AND name = 'renewal_1d'  LIMIT 1;
    SELECT id INTO v_tpl_exp FROM whatsapp_templates WHERE gym_id = v_gym_id AND name = 'renewal_expired' LIMIT 1;
    SELECT id INTO v_tpl_7a  FROM whatsapp_templates WHERE gym_id = v_gym_id AND name = 'renewal_final'   LIMIT 1;

    -- Insert default renewal configs
    INSERT INTO gym_renewal_configs (gym_id, trigger_type, is_active, template_id, include_offer, offer_pct, updated_at)
    VALUES
      (v_gym_id, 'days_7_before', true,  v_tpl_7d,  false, NULL, now()),
      (v_gym_id, 'days_3_before', true,  v_tpl_3d,  true,  10,   now()),
      (v_gym_id, 'days_1_before', true,  v_tpl_1d,  false, NULL, now()),
      (v_gym_id, 'on_expiry',     true,  v_tpl_exp, false, NULL, now()),
      (v_gym_id, 'days_7_after',  true,  v_tpl_7a,  false, NULL, now()),
      (v_gym_id, 'days_30_after', false, NULL,       false, NULL, now())
    ON CONFLICT (gym_id, trigger_type) DO NOTHING;

  END LOOP;
END $$;
