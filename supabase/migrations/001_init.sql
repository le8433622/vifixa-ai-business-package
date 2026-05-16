-- Vifixa AI Database Schema - Initial Migration
-- Based on 20_DATABASE_SCHEMA.md

-- Enable UUID extension (gen_random_uuid() is built-in for PostgreSQL 13+)

-- Profiles table (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('customer', 'worker', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workers table
CREATE TABLE IF NOT EXISTS public.workers (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  service_areas JSONB NOT NULL DEFAULT '[]'::jsonb,
  trust_score INTEGER DEFAULT 50,
  is_verified BOOLEAN DEFAULT FALSE,
  avg_earnings NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.profiles(id) NOT NULL,
  worker_id UUID REFERENCES public.workers(user_id),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  media_urls JSONB,
  ai_diagnosis JSONB,
  estimated_price NUMERIC NOT NULL,
  final_price NUMERIC,
  status TEXT NOT NULL CHECK (status IN ('pending', 'matched', 'in_progress', 'completed', 'cancelled', 'disputed')),
  before_media JSONB,
  after_media JSONB,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI_Logs table
CREATE TABLE IF NOT EXISTS public.ai_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id),
  agent_type TEXT NOT NULL CHECK (agent_type IN ('diagnosis', 'pricing', 'matching', 'quality', 'dispute', 'coach', 'fraud')),
  input JSONB NOT NULL,
  output JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Workers can view customer profiles for assigned orders" ON public.profiles;
CREATE POLICY "Workers can view customer profiles for assigned orders"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.customer_id = profiles.id
      AND orders.worker_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for workers
DROP POLICY IF EXISTS "Workers can manage own worker profile" ON public.workers;
CREATE POLICY "Workers can manage own worker profile"
  ON public.workers FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Customers can view verified worker profiles" ON public.workers;
CREATE POLICY "Customers can view verified worker profiles"
  ON public.workers FOR SELECT
  USING (is_verified = true);

DROP POLICY IF EXISTS "Admins can manage all worker profiles" ON public.workers;
CREATE POLICY "Admins can manage all worker profiles"
  ON public.workers FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for orders
DROP POLICY IF EXISTS "Customers can view own orders" ON public.orders;
CREATE POLICY "Customers can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers can create orders" ON public.orders;
CREATE POLICY "Customers can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Workers can view assigned orders" ON public.orders;
CREATE POLICY "Workers can view assigned orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = worker_id);

DROP POLICY IF EXISTS "Workers can update assigned orders" ON public.orders;
CREATE POLICY "Workers can update assigned orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = worker_id);

DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
CREATE POLICY "Admins can manage all orders"
  ON public.orders FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for ai_logs
DROP POLICY IF EXISTS "Only admins can view AI logs" ON public.ai_logs;
CREATE POLICY "Only admins can view AI logs"
  ON public.ai_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_worker_id ON public.orders(worker_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_ai_logs_order_id ON public.ai_logs(order_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_orders_updated_at ON public.orders;
CREATE TRIGGER handle_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Transactions table (needed by multi_ledger_wallet, created IF NOT EXISTS since 20260514_ai_map_payment_core is in remote history)
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

-- Wallets table (needed by multi_ledger_wallet)
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
