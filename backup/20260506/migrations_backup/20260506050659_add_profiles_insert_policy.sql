-- Migration: Add INSERT policy for profiles
-- Per Step 10: Fix RLS policy for profiles INSERT

-- Allow users to insert their own profile (id must match auth.uid())
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Also allow the service role to insert profiles (for admin operations)
CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT
  USING (auth.role() = 'service_role');
