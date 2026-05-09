-- Migration: Create payment system tables
-- Date: 2026-05-10
-- Purpose: payment_intents, wallets, ledger_entries, webhook_events, payouts

-- ========== 1. PAYMENT_INTENTS ==========
CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway TEXT NOT NULL REFERENCES gateway_configs(key),
  gateway_payment_id TEXT NOT NULL,
  order_id UUID REFERENCES orders(id),
  user_id UUID REFERENCES profiles(id),
  amount BIGINT NOT NULL,                 -- smallest unit (VND)
  currency TEXT NOT NULL DEFAULT 'VND',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','requires_payment_method','requires_action',
                      'processing','succeeded','failed','canceled','refunded')),
  idempotency_key TEXT UNIQUE,
  gateway_response JSONB,
  redirect_url TEXT,
  qr_code TEXT,
  deep_link TEXT,
  succeeded_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_gateway ON payment_intents(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_intents_order ON payment_intents(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_user ON payment_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status);

ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payment intents" ON payment_intents;
CREATE POLICY "Users can view own payment intents" ON payment_intents
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin full access payment_intents" ON payment_intents;
CREATE POLICY "Admin full access payment_intents" ON payment_intents
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

DROP TRIGGER IF EXISTS trigger_payment_intents_updated_at ON payment_intents;
CREATE TRIGGER trigger_payment_intents_updated_at
  BEFORE UPDATE ON payment_intents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== 2. WEBHOOK_EVENTS ==========
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway TEXT NOT NULL,
  event_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT,
  payment_intent_id UUID REFERENCES payment_intents(id),
  raw JSONB,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gateway, event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_payment ON webhook_events(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed) WHERE processed = false;

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access webhook_events" ON webhook_events;
CREATE POLICY "Admin full access webhook_events" ON webhook_events
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- ========== 3. WALLETS ==========
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) UNIQUE NOT NULL,
  balance BIGINT DEFAULT 0,                    -- current available balance (VND)
  locked_amount BIGINT DEFAULT 0,                 -- held for pending orders
  currency TEXT DEFAULT 'VND',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallet" ON wallets;
CREATE POLICY "Users can view own wallet" ON wallets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin full access wallets" ON wallets;
CREATE POLICY "Admin full access wallets" ON wallets
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

DROP TRIGGER IF EXISTS trigger_wallets_updated_at ON wallets;
CREATE TRIGGER trigger_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== 4. LEDGER_ENTRIES (Double-Entry) ==========
CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,               -- groups related entries
  wallet_id UUID REFERENCES wallets(id),
  account TEXT NOT NULL,                        -- 'user.wallet', 'platform.fee', 'escrow', etc.
  direction TEXT NOT NULL CHECK (direction IN ('debit', 'credit')),
  amount BIGINT NOT NULL,
  currency TEXT DEFAULT 'VND',
  balance_after BIGINT,                          -- snapshot for easy querying
  reference_type TEXT NOT NULL,                    -- 'payment', 'payout', 'fee', 'refund'
  reference_id UUID,                                -- payment_intents.id / payouts.id
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_wallet ON ledger_entries(wallet_id);
CREATE INDEX IF NOT EXISTS idx_ledger_transaction ON ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created ON ledger_entries(created_at DESC);

ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ledger entries" ON ledger_entries;
CREATE POLICY "Users can view own ledger entries" ON ledger_entries
  FOR SELECT USING (
    wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admin full access ledger_entries" ON ledger_entries;
CREATE POLICY "Admin full access ledger_entries" ON ledger_entries
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- ========== 5. PAYOUTS (ALTER existing table) ==========
-- Table already exists from 003_payments.sql, alter to add new columns
ALTER TABLE payouts
  ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES wallets(id),
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS fee BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bank_account JSONB,
  ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Update existing rows to set user_id from worker_id
UPDATE payouts SET user_id = worker_id WHERE user_id IS NULL;

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_payouts_wallet ON payouts(wallet_id);
CREATE INDEX IF NOT EXISTS idx_payouts_user_new ON payouts(user_id);

-- Enable RLS (if not already)
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (recreate with user_id)
DROP POLICY IF EXISTS "Workers can view own payouts" ON payouts;
CREATE POLICY "Users can view own payouts" ON payouts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage payouts" ON payouts;
CREATE POLICY "Admin full access payouts" ON payouts
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- ========== 6. GRANT PERMISSIONS ==========
GRANT ALL ON payment_intents, webhook_events, wallets, ledger_entries, payouts TO service_role;
GRANT SELECT ON payment_intents, webhook_events, wallets, ledger_entries, payouts TO authenticated;
