-- Migration: Create gateway_configs table
-- Date: 2026-05-10
-- Purpose: Store payment gateway configurations (VNPay, MoMo, ZaloPay, Stripe)

-- 1. Create gateway_configs table
CREATE TABLE IF NOT EXISTS gateway_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,               -- 'vnpay', 'momo', 'zalopay', 'stripe'
  display_name TEXT NOT NULL,                -- 'VNPay', 'MoMo', etc.
  description TEXT,
  active BOOLEAN DEFAULT false NOT NULL,
  sandbox BOOLEAN DEFAULT true NOT NULL,     -- true = test/sandbox mode
  sandbox_keys JSONB DEFAULT '{}'::jsonb,      -- API keys for sandbox
  live_keys JSONB DEFAULT '{}'::jsonb,          -- API keys for production
  priority INTEGER DEFAULT 0,                 -- lower = higher priority
  supported_currencies TEXT[] DEFAULT '{VND}',
  supported_methods TEXT[] DEFAULT '{}',        -- 'qr', 'bank_transfer', 'card', 'wallet'
  webhook_url TEXT,                           -- auto-generated webhook URL
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_by UUID REFERENCES auth.users(id)
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_gateway_configs_key ON gateway_configs(key);
CREATE INDEX IF NOT EXISTS idx_gateway_configs_active ON gateway_configs(active) WHERE active = true;

-- 3. Enable RLS
ALTER TABLE gateway_configs ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies (idempotent)
DROP POLICY IF EXISTS "Admin full access gateway_configs" ON gateway_configs;
DROP POLICY IF EXISTS "Public read active gateways" ON gateway_configs;

-- 5. RLS Policies

-- Admin has full access
CREATE POLICY "Admin full access gateway_configs" ON gateway_configs
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Anyone can read active gateways (for checkout page)
CREATE POLICY "Public read active gateways" ON gateway_configs
  FOR SELECT USING (active = true);

-- 6. Updated_at trigger
DROP TRIGGER IF EXISTS trigger_gateway_configs_updated_at ON gateway_configs;
CREATE TRIGGER trigger_gateway_configs_updated_at
  BEFORE UPDATE ON gateway_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Seed data (Vietnam payment gateways + Stripe for future)
INSERT INTO gateway_configs (key, display_name, description, active, sandbox, priority, supported_currencies, supported_methods) VALUES
('vnpay', 'VNPay', 'Vietnam national payment gateway - domestic cards, QR, internet banking', false, true, 1, '{VND}', '{bank_transfer,qr,card}'),
('momo', 'MoMo', 'Mobile wallet - popular in Vietnam for P2P and e-commerce', false, true, 2, '{VND}', '{wallet,qr}'),
('zalopay', 'ZaloPay', 'ZaloPay wallet - integrated with Zalo ecosystem', false, true, 3, '{VND}', '{wallet,qr,bank_transfer}'),
('stripe', 'Stripe', 'Global payment gateway for international payments (future)', false, true, 4, '{USD,EUR,GBP}', '{card,sepa,ideal}')
ON CONFLICT (key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  supported_currencies = EXCLUDED.supported_currencies,
  supported_methods = EXCLUDED.supported_methods;

-- 8. Grant permissions
GRANT ALL ON gateway_configs TO service_role;
GRANT SELECT ON gateway_configs TO authenticated;
GRANT SELECT ON gateway_configs TO anon;
