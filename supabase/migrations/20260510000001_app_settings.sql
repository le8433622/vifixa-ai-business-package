-- Migration: Create app_settings table + seed data
-- Date: 2026-05-10
-- Purpose: General application settings (admin configurable)

-- 1. Create app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  value_type TEXT DEFAULT 'text' CHECK (value_type IN ('text','number','boolean','json')),
  category TEXT DEFAULT 'general',
  label TEXT,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_app_settings_category ON app_settings(category);
CREATE INDEX IF NOT EXISTS idx_app_settings_public ON app_settings(is_public) WHERE is_public = true;

-- 3. Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies (idempotent)
DROP POLICY IF EXISTS "Admin full access app_settings" ON app_settings;
DROP POLICY IF EXISTS "Public read public settings" ON app_settings;

-- 5. RLS Policies

-- Admin has full access
CREATE POLICY "Admin full access app_settings" ON app_settings
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Public read for is_public=true
CREATE POLICY "Public read public settings" ON app_settings
  FOR SELECT USING (is_public = true);

-- 6. Updated_at trigger
DROP TRIGGER IF EXISTS trigger_app_settings_updated_at ON app_settings;
CREATE TRIGGER trigger_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Seed data
INSERT INTO app_settings (key, value, value_type, category, label, description, is_public) VALUES
('app_name', 'Vifixa AI', 'text', 'general', 'Application Name', 'Display name of the application', true),
('app_description', 'AI-Powered Home Services', 'text', 'general', 'Description', 'Brief description of the app', true),
('primary_currency', 'VND', 'text', 'general', 'Primary Currency', 'Default currency for the platform', false),
('support_email', NULL, 'text', 'general', 'Support Email', 'Customer support email address', true),
('support_phone', NULL, 'text', 'general', 'Support Phone', 'Hotline support number', true),
('platform_fee_percent', '10', 'number', 'billing', 'Platform Fee %', 'Platform fee percentage charged on transactions', false),
('min_payout_amount', '50000', 'number', 'wallet', 'Min Payout (VND)', 'Minimum amount user can withdraw at once', false),
('max_payout_amount', '50000000', 'number', 'wallet', 'Max Payout (VND)', 'Maximum amount user can withdraw at once', false),
('payout_fee', '5000', 'number', 'wallet', 'Payout Fee (VND)', 'Fee charged per withdrawal transaction', false),
('maintenance_message', 'Hệ thống đang bảo trì, vui lòng quay lại sau.', 'text', 'system', 'Maintenance Message', 'Message shown during maintenance mode', true),
('terms_url', NULL, 'text', 'legal', 'Terms of Service URL', 'Link to terms of service page', true),
('privacy_url', NULL, 'text', 'legal', 'Privacy Policy URL', 'Link to privacy policy page', true)

ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  value_type = EXCLUDED.value_type,
  category = EXCLUDED.category,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  is_public = EXCLUDED.is_public;

-- 8. Grant permissions
GRANT ALL ON app_settings TO service_role;
GRANT SELECT ON app_settings TO authenticated;
GRANT SELECT ON app_settings TO anon;
