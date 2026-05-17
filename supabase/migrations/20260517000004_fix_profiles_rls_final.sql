-- Final fix: rebuild ALL profiles policies with NO recursive subqueries
-- The SECURITY DEFINER function approach didn't work for anon users
-- New approach: use auth.jwt() to extract role from user_metadata or app_metadata

-- Step 1: Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Workers can view customer profiles for assigned orders" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "service_role manages all" ON public.profiles;

-- Step 2: Recreate simple non-recursive policies
-- Users can always see their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Workers can view customer profiles for assigned orders (non-recursive — references orders, not profiles)
CREATE POLICY "Workers can view customer profiles for assigned orders"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.customer_id = profiles.id
      AND orders.worker_id = auth.uid()
    )
  );

-- Admins can view all — using auth.jwt() to check admin status stored in user_metadata
-- This avoids ANY query on profiles during policy evaluation
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.jwt() ->> 'user_metadata' IS NOT NULL
    AND COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      ''
    ) = 'admin'
  );
