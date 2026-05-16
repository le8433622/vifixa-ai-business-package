-- Bootstrap payment tables missing from remote DB
-- 20260514_ai_map_payment_core is in remote history but tables don't exist
-- This runs before multi_ledger_wallet so it can ALTER them

CREATE TABLE IF NOT EXISTS transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID REFERENCES orders(id),
  user_id         UUID REFERENCES auth.users(id) NOT NULL,
  gateway         TEXT NOT NULL CHECK (gateway IN ('vnpay', 'stripe', 'wallet')),
  gateway_txn_id  TEXT,
  amount          NUMERIC NOT NULL,
  currency        TEXT DEFAULT 'VND',
  fee             NUMERIC DEFAULT 0,
  status          TEXT DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded')),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  succeeded_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_transactions_order ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_gateway ON transactions(gateway_txn_id);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS wallets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  balance     NUMERIC DEFAULT 0,
  locked      NUMERIC DEFAULT 0,
  currency    TEXT DEFAULT 'VND',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;