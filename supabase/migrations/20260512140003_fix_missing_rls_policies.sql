-- Migration: Enable RLS on tables missing row-level security
-- Date: 2026-05-10
-- Tables: trust_scores, complaints, warranty_claims (policies existed in 004 but RLS was never enabled)
--         price_standards (intentionally public read but needed RLS)
--         demand_metrics (missing entirely)

-- ============================================
-- 1. trust_scores — enable RLS + add worker self-view
-- ============================================
ALTER TABLE public.trust_scores ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trust_scores' AND column_name = 'worker_id'
  ) THEN
    EXECUTE 'CREATE POLICY "Workers can view own trust scores"
      ON public.trust_scores FOR SELECT
      USING (auth.uid() = worker_id)';
  END IF;
END $$;

-- Note: admin policy "Admins can view all trust scores" already exists from 004_fix_rls_recursion

-- ============================================
-- 2. complaints — enable RLS + add customer self-view
-- ============================================
ALTER TABLE IF EXISTS public.complaints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view own complaints" ON public.complaints;
CREATE POLICY "Customers can view own complaints"
  ON public.complaints FOR SELECT
  USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers can create complaints" ON public.complaints;
CREATE POLICY "Customers can create complaints"
  ON public.complaints FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Note: admin policy "Admins can manage all complaints" already exists from 004_fix_rls_recursion

-- ============================================
-- 3. warranty_claims — enable RLS + add customer self-view
-- ============================================
ALTER TABLE IF EXISTS public.warranty_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view own warranty claims" ON public.warranty_claims;
CREATE POLICY "Customers can view own warranty claims"
  ON public.warranty_claims FOR SELECT
  USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers can create warranty claims" ON public.warranty_claims;
CREATE POLICY "Customers can create warranty claims"
  ON public.warranty_claims FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- ============================================
-- 4. price_standards — enable RLS (public read, admin write)
-- ============================================
ALTER TABLE IF EXISTS public.price_standards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Price standards are viewable by everyone" ON public.price_standards;
CREATE POLICY "Price standards are viewable by everyone"
  ON public.price_standards FOR SELECT
  USING (true);

-- ============================================
-- 5. demand_metrics — enable RLS (admin only)
-- ============================================
ALTER TABLE IF EXISTS public.demand_metrics ENABLE ROW LEVEL SECURITY;