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
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Workers can view customer profiles for assigned orders"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.customer_id = profiles.id
      AND orders.worker_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for workers
CREATE POLICY "Workers can manage own worker profile"
  ON public.workers FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Customers can view verified worker profiles"
  ON public.workers FOR SELECT
  USING (is_verified = true);

CREATE POLICY "Admins can manage all worker profiles"
  ON public.workers FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for orders
CREATE POLICY "Customers can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Workers can view assigned orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = worker_id);

CREATE POLICY "Workers can update assigned orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = worker_id);

CREATE POLICY "Admins can manage all orders"
  ON public.orders FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for ai_logs
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
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
