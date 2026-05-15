-- Migration 002: AI + Map + Payment Core
-- 3 trụ cột phục vụ khách hàng

-- ========== 1. SERVICE REQUESTS (AI Core) ==========
CREATE TABLE IF NOT EXISTS service_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID REFERENCES auth.users(id) NOT NULL,
  description     TEXT NOT NULL,
  media_urls      JSONB DEFAULT '[]',
  category        TEXT,
  diagnosis       JSONB,
  price_estimate  JSONB,
  status          TEXT DEFAULT 'diagnosing'
                  CHECK (status IN ('diagnosing', 'priced', 'cancelled')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requests_customer ON service_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON service_requests(status);

ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can manage own requests"
  ON service_requests FOR ALL
  USING (auth.uid() = customer_id);

CREATE POLICY "Admins can view all requests"
  ON service_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP TRIGGER IF EXISTS trigger_service_requests_updated_at ON service_requests;
CREATE TRIGGER trigger_service_requests_updated_at
  BEFORE UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== 2. WORKERS (Map Core) ==========
CREATE TABLE IF NOT EXISTS workers (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT,
  phone           TEXT,
  avatar_url      TEXT,
  location_lat    NUMERIC,
  location_lng    NUMERIC,
  service_radius  NUMERIC DEFAULT 10,
  is_verified     BOOLEAN DEFAULT false,
  trust_score     NUMERIC DEFAULT 50,
  rating_avg      NUMERIC DEFAULT 0,
  order_count     INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workers_location ON workers(location_lat, location_lng);
CREATE INDEX IF NOT EXISTS idx_workers_verified ON workers(is_verified) WHERE is_verified = true;

ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can manage own profile"
  ON workers FOR ALL
  USING (auth.uid() = id);

CREATE POLICY "Customers can view verified workers"
  ON workers FOR SELECT
  USING (is_verified = true);

CREATE POLICY "Admins can manage all workers"
  ON workers FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP TRIGGER IF EXISTS trigger_workers_updated_at ON workers;
CREATE TRIGGER trigger_workers_updated_at
  BEFORE UPDATE ON workers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== 3. ORDERS (Map + Payment Core) ==========
CREATE TABLE IF NOT EXISTS orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID REFERENCES service_requests(id),
  customer_id     UUID REFERENCES auth.users(id) NOT NULL,
  worker_id       UUID REFERENCES auth.users(id),
  location_lat    NUMERIC NOT NULL,
  location_lng    NUMERIC NOT NULL,
  address         TEXT,
  category        TEXT NOT NULL,
  description     TEXT NOT NULL,
  media_urls      JSONB DEFAULT '[]',
  diagnosis       JSONB,
  status          TEXT DEFAULT 'pending'
                  CHECK (status IN ('pending', 'matched', 'in_progress', 'completed', 'cancelled', 'disputed')),
  estimated_price NUMERIC,
  final_price     NUMERIC,
  platform_fee    NUMERIC DEFAULT 0,
  worker_payout   NUMERIC DEFAULT 0,
  payment_status  TEXT DEFAULT 'unpaid'
                  CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'failed')),
  before_media    JSONB DEFAULT '[]',
  after_media     JSONB DEFAULT '[]',
  rating          INT CHECK (rating BETWEEN 1 AND 5),
  review_comment  TEXT,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_worker ON orders(worker_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_location ON orders(location_lat, location_lng);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Workers can view assigned orders"
  ON orders FOR SELECT
  USING (auth.uid() = worker_id);

CREATE POLICY "Workers can update assigned orders"
  ON orders FOR UPDATE
  USING (auth.uid() = worker_id);

CREATE POLICY "Admins can manage all orders"
  ON orders FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP TRIGGER IF EXISTS trigger_orders_updated_at ON orders;
CREATE TRIGGER trigger_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== 4. TRANSACTIONS (Payment Core) ==========
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

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
  ON transactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "System can create transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "System can update transactions"
  ON transactions FOR UPDATE
  USING (auth.role() = 'service_role');

-- ========== 5. WALLETS (Payment Core) ==========
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

CREATE POLICY "Users can view own wallet"
  ON wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage wallets"
  ON wallets FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP TRIGGER IF EXISTS trigger_wallets_updated_at ON wallets;
CREATE TRIGGER trigger_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== 6. LEDGER (Double-Entry Accounting) ==========
CREATE TABLE IF NOT EXISTS ledger (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_id      UUID NOT NULL,
  wallet_id   UUID REFERENCES wallets(id),
  account     TEXT NOT NULL,
  direction   TEXT NOT NULL CHECK (direction IN ('debit', 'credit')),
  amount      NUMERIC NOT NULL,
  currency    TEXT DEFAULT 'VND',
  ref_type    TEXT,
  ref_id      UUID,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_txn ON ledger(txn_id);
CREATE INDEX IF NOT EXISTS idx_ledger_wallet ON ledger(wallet_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created ON ledger(created_at DESC);

ALTER TABLE ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ledger"
  ON ledger FOR SELECT
  USING (wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all ledger"
  ON ledger FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "System can insert ledger"
  ON ledger FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ========== 7. AI LOGS (Audit Trail) ==========
CREATE TABLE IF NOT EXISTS ai_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID REFERENCES orders(id),
  agent_type  TEXT NOT NULL,
  input       JSONB NOT NULL,
  output      JSONB NOT NULL,
  latency_ms  INT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_order ON ai_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_agent ON ai_logs(agent_type);

ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view AI logs"
  ON ai_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ========== 8. PROFILES (Extended Auth) ==========
-- Profiles table (extends auth.users with role)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT UNIQUE NOT NULL,
  phone       TEXT UNIQUE,
  role        TEXT NOT NULL CHECK (role IN ('customer', 'worker', 'admin')),
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== 9. TRIGGER: Auto-create profile + companion on signup ==========
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, COALESCE(NEW.email, 'user@' || NEW.id || '.temp'), 'customer')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.companion_profiles (user_id, persona, display_name)
  VALUES (NEW.id, 'customer', 'Vifixa')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ========== 10. GRANT PERMISSIONS ==========
GRANT ALL ON service_requests, workers, orders, transactions, wallets, ledger, ai_logs, profiles TO service_role;
GRANT SELECT, INSERT, UPDATE ON service_requests, orders, profiles TO authenticated;
GRANT SELECT ON workers, transactions, wallets, ledger TO authenticated;
GRANT SELECT ON workers TO anon;