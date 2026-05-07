-- Migration: Fix RLS infinite recursion
-- Per Step 10: Final Verification - Fix RLS recursion

-- Create security definer function to check admin role (bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Drop problematic policies that cause recursion
DROP POLICY IF EXISTS "Workers can view customer profiles for assigned orders" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all trust scores" ON trust_scores;
DROP POLICY IF EXISTS "Admins can manage all complaints" ON complaints;
DROP POLICY IF EXISTS "Admins can manage all warranty claims" ON warranty_claims;
DROP POLICY IF EXISTS "Only admins can view AI logs" ON ai_logs;

-- Recreate policies WITHOUT recursion (using is_admin() function)

-- Admins can manage all orders (using is_admin())
CREATE POLICY "Admins can manage all orders"
  ON public.orders FOR ALL
  USING (is_admin());

-- Admins can view all profiles (using is_admin())
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (is_admin());

-- Workers can view customer profiles for assigned orders (simplified)
CREATE POLICY "Workers can view customer profiles for assigned orders"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.customer_id = profiles.id
      AND orders.worker_id = auth.uid()
    )
  );

-- Admins can view all trust scores
CREATE POLICY "Admins can view all trust scores"
  ON public.trust_scores FOR SELECT
  USING (is_admin());

-- Admins can manage all complaints
CREATE POLICY "Admins can manage all complaints"
  ON public.complaints FOR ALL
  USING (is_admin());

-- Admins can manage all warranty claims
CREATE POLICY "Admins can manage all warranty claims"
  ON public.warranty_claims FOR ALL
  USING (is_admin());

-- Only admins can view AI logs
CREATE POLICY "Only admins can view AI logs"
  ON public.ai_logs FOR SELECT
  USING (is_admin());

-- Workers can view assigned orders (simplified)
DROP POLICY IF EXISTS "Workers can view assigned orders" ON orders;
CREATE POLICY "Workers can view assigned orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = worker_id);

