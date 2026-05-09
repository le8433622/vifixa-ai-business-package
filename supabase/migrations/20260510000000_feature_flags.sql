-- Migration: Create feature_flags table + seed data
-- Date: 2026-05-10
-- Purpose: Foundation for toggle-on/off feature system

-- 0. Create the updated_at trigger function (idempotent)
-- This function may already exist from previous migrations, so we use CREATE OR REPLACE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 1. Create feature_flags table
CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT false NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('payment','wallet','ai','notification','security','system')),
  requires_config BOOLEAN DEFAULT false NOT NULL,
  config_completed BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_by UUID REFERENCES auth.users(id)
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_feature_flags_category ON feature_flags(category);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled) WHERE enabled = true;

-- 3. Enable RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if any (for idempotent migration)
DROP POLICY IF EXISTS "Admin full access feature_flags" ON feature_flags;
DROP POLICY IF EXISTS "Public read enabled flags" ON feature_flags;

-- 5. RLS Policies

-- Admin has full access
CREATE POLICY "Admin full access feature_flags" ON feature_flags
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Everyone can read (to check enabled flags from client)
CREATE POLICY "Public read enabled flags" ON feature_flags
  FOR SELECT USING (true);

-- 6. Updated_at trigger
DROP TRIGGER IF EXISTS trigger_feature_flags_updated_at ON feature_flags;
CREATE TRIGGER trigger_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Seed data (all feature flags in the system)
-- Use INSERT ... ON CONFLICT to make it idempotent

INSERT INTO feature_flags (key, label, description, enabled, category, requires_config) VALUES
-- Payment features
('payment_gateway', 'Payment Gateway', 'Enable VNPay, MoMo, ZaloPay payment gateways', false, 'payment', true),
('internal_wallet', 'Internal Wallet', 'Worker wallet + escrow system for payments', false, 'wallet', true),
('worker_payouts', 'Worker Payouts', 'Enable automated worker withdrawal requests', false, 'wallet', true),
('stripe_connect', 'Stripe Connect', 'Stripe integration for international payments', false, 'payment', true),

-- AI features
('ai_chat', 'AI Chat', 'AI-powered diagnostic chat for customers', true, 'ai', false),
('ai_warranty', 'AI Warranty', 'AI warranty claim processing', true, 'ai', false),
('ai_quality_monitor', 'AI Quality Monitor', 'AI trust score and quality metrics', true, 'ai', false),
('ai_suggestions', 'AI Suggestions', 'Smart suggestions for workers and customers', false, 'ai', true),

-- Notification features
('email_notifications', 'Email Notifications', 'Transactional email system (invoices, alerts)', false, 'notification', true),
('sms_notifications', 'SMS Notifications', 'SMS alerts for urgent updates', false, 'notification', true),
('push_notifications', 'Push Notifications', 'Mobile push notifications', false, 'notification', true),

-- Security features
('maintenance_mode', 'Maintenance Mode', 'Show maintenance banner to all users', false, 'system', false),
('debug_mode', 'Debug Mode', 'Show debug info to admins only', false, 'security', false),
('rate_limit_strict', 'Strict Rate Limiting', 'Enable strict rate limiting on all APIs', false, 'security', false),

-- System features
('worker_registration', 'Worker Registration', 'Allow new worker signups', true, 'system', false),
('customer_registration', 'Customer Registration', 'Allow new customer signups', true, 'system', false),
('subscriptions', 'Subscription Plans', 'Enable subscription billing for services', false, 'payment', true)

ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  requires_config = EXCLUDED.requires_config;

-- 8. Grant permissions
GRANT ALL ON feature_flags TO service_role;
GRANT SELECT ON feature_flags TO authenticated;
GRANT SELECT ON feature_flags TO anon;
