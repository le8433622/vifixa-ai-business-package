-- Migration: Enable RLS on tables missing row-level security
-- Date: 2026-05-10
-- Tables: trust_scores, complaints, warranty_claims (policies existed in 004 but RLS was never enabled)
--         price_standards (intentionally public read but needed RLS)
--         demand_metrics (missing entirely)

-- ============================================
-- 1. trust_scores — enable RLS + add worker self-view
-- ============================================
ALTER TABLE public.trust_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can view own trust scores"
  ON public.trust_scores FOR SELECT
  USING (auth.uid() = worker_id);

-- Note: admin policy "Admins can view all trust scores" already exists from 004_fix_rls_recursion

-- ============================================
-- 2. complaints — enable RLS + add customer self-view
-- ============================================
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own complaints"
  ON public.complaints FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create complaints"
  ON public.complaints FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Note: admin policy "Admins can manage all complaints" already exists from 004_fix_rls_recursion

-- ============================================
-- 3. warranty_claims — enable RLS + add customer self-view
-- ============================================
ALTER TABLE public.warranty_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own warranty claims"
  ON public.warranty_claims FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create warranty claims"
  ON public.warranty_claims FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Note: admin policy "Admins can manage all warranty claims" already exists from 004_fix_rls_recursion

-- ============================================
-- 4. price_standards — enable RLS (public read, admin write)
-- ============================================
ALTER TABLE public.price_standards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Price standards are viewable by everyone"
  ON public.price_standards FOR SELECT
  USING (true);

CREATE POLICY "Price standards manageable by admins"
  ON public.price_standards FOR ALL
  USING (is_admin());

-- ============================================
-- 5. demand_metrics — enable RLS (admin only)
-- ============================================
ALTER TABLE public.demand_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Demand metrics viewable by admins"
  ON public.demand_metrics FOR SELECT
  USING (is_admin());

CREATE POLICY "Demand metrics manageable by admins"
  ON public.demand_metrics FOR ALL
  USING (is_admin());