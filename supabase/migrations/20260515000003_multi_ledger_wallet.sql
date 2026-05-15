-- 🏛️ Vifixa Multi-Ledger Dynamic Wallet
-- 4 wallet types per user: Transaction · Staking · Reward · Treasury
-- Double-entry accounting + Escrow + VFC Points

-- ========== 1. WALLET TYPES ENUM ==========
DO $$ BEGIN
  CREATE TYPE wallet_type AS ENUM ('txn', 'stake', 'reward', 'treasury');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========== 2. EXTEND WALLETS TABLE ==========
-- Convert từ single-wallet sang multi-wallet
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS wallet_type wallet_type DEFAULT 'txn';
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_user_id_unique;
CREATE INDEX IF NOT EXISTS idx_wallets_user_type ON wallets(user_id, wallet_type);

-- Mỗi user có 4 wallets (mặc định nếu chưa có)
CREATE OR REPLACE FUNCTION ensure_user_wallets(user_uuid UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO wallets (user_id, wallet_type, balance, locked, currency)
  VALUES 
    (user_uuid, 'txn', 0, 0, 'VND'),
    (user_uuid, 'stake', 0, 0, 'VND'),
    (user_uuid, 'reward', 0, 0, 'VFC'),
    (user_uuid, 'treasury', 0, 0, 'VND')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== 3. VFC POINTS SYSTEM ==========
CREATE TABLE IF NOT EXISTS vfc_points (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) NOT NULL,
  balance       NUMERIC DEFAULT 0,
  earned_total  NUMERIC DEFAULT 0,
  spent_total   NUMERIC DEFAULT 0,
  tier          TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'diamond')),
  multiplier    NUMERIC DEFAULT 1.0,  -- Tier multiplier for earnings
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vfc_user ON vfc_points(user_id);
ALTER TABLE vfc_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own VFC"
  ON vfc_points FOR SELECT USING (auth.uid() = user_id);

-- ========== 4. STAKING TABLE ==========
CREATE TABLE IF NOT EXISTS staking (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) NOT NULL,
  wallet_id     UUID REFERENCES wallets(id) NOT NULL,
  amount        NUMERIC NOT NULL CHECK (amount > 0),
  interest_rate NUMERIC NOT NULL DEFAULT 5.0,  -- % per year
  start_date    TIMESTAMPTZ DEFAULT NOW(),
  end_date      TIMESTAMPTZ,  -- NULL = indefinite
  status        TEXT DEFAULT 'active' CHECK (status IN ('active', 'matured', 'cancelled')),
  auto_renew    BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staking_user ON staking(user_id);
CREATE INDEX IF NOT EXISTS idx_staking_status ON staking(status);
ALTER TABLE staking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own staking"
  ON staking FOR ALL USING (auth.uid() = user_id);

-- ========== 5. EXTEND TRANSACTIONS ==========
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS wallet_type wallet_type;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS split_info JSONB;  -- Auto-split data
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS escrow_status TEXT CHECK (escrow_status IN ('pending', 'released', 'refunded', 'disputed'));

-- ========== 6. ESCROW TABLE ==========
CREATE TABLE IF NOT EXISTS escrow (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID REFERENCES orders(id) NOT NULL,
  customer_id     UUID REFERENCES auth.users(id) NOT NULL,
  worker_id       UUID REFERENCES auth.users(id) NOT NULL,
  amount          NUMERIC NOT NULL,
  platform_fee    NUMERIC DEFAULT 0,
  worker_payout   NUMERIC DEFAULT 0,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'released', 'refunded', 'disputed')),
  released_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id)
);
ALTER TABLE escrow ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties view escrow"
  ON escrow FOR SELECT
  USING (auth.uid() = customer_id OR auth.uid() = worker_id);

CREATE POLICY "System manages escrow"
  ON escrow FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- ========== 7. LEDGER INDEXES ==========
CREATE INDEX IF NOT EXISTS idx_ledger_wallet_type ON ledger(wallet_id, created_at DESC);

-- ========== 8. AUTO-CREATE WALLETS FOR NEW USERS ==========
CREATE OR REPLACE FUNCTION handle_new_user_wallets()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM ensure_user_wallets(NEW.id);
  INSERT INTO vfc_points (user_id, balance) VALUES (NEW.id, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_wallets ON auth.users;
CREATE TRIGGER on_auth_user_created_wallets
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_wallets();

-- ========== 9. TIER CALCULATION FUNCTION ==========
CREATE OR REPLACE FUNCTION calculate_vfc_tier(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  total_earned NUMERIC;
  new_tier TEXT;
BEGIN
  SELECT earned_total INTO total_earned FROM vfc_points WHERE user_id = user_uuid;
  
  new_tier := CASE
    WHEN total_earned >= 1000000 THEN 'diamond'
    WHEN total_earned >= 500000 THEN 'gold'
    WHEN total_earned >= 100000 THEN 'silver'
    ELSE 'bronze'
  END;
  
  UPDATE vfc_points SET 
    tier = new_tier,
    multiplier = CASE new_tier
      WHEN 'diamond' THEN 3.0
      WHEN 'gold' THEN 2.0
      WHEN 'silver' THEN 1.5
      ELSE 1.0
    END,
    updated_at = NOW()
  WHERE user_id = user_uuid;
  
  RETURN new_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
