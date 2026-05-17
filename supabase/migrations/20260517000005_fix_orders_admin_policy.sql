-- Fix circular RLS recursion across ALL tables: profiles → orders → profiles
-- 24 tables had admin-check policies querying profiles, creating infinite recursion
-- Fix: replace ALL admin checks with auth.jwt() via helper function

-- Helper: check admin role from JWT (no DB queries, no recursion)
CREATE OR REPLACE FUNCTION public.is_admin_from_jwt()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'role',
    auth.jwt() -> 'app_metadata' ->> 'role',
    ''
  ) = 'admin';
$$;

-- Remove stale SECURITY DEFINER function from earlier attempts
DROP FUNCTION IF EXISTS public.check_is_admin;

-- ====== ab_tests ======
DROP POLICY IF EXISTS "Admin full access ab_tests" ON public.ab_tests;
CREATE POLICY "Admin full access ab_tests"
  ON public.ab_tests FOR ALL USING (public.is_admin_from_jwt());

-- ====== account_locks ======
DROP POLICY IF EXISTS "Admins can manage locks" ON public.account_locks;
CREATE POLICY "Admins can manage locks"
  ON public.account_locks FOR ALL USING (public.is_admin_from_jwt());

-- ====== admin_review_queue ======
DROP POLICY IF EXISTS "Admins can see all review queue" ON public.admin_review_queue;
CREATE POLICY "Admins can see all review queue"
  ON public.admin_review_queue FOR ALL USING (public.is_admin_from_jwt());

-- ====== ai_logs ======
DROP POLICY IF EXISTS "Only admins can view AI logs" ON public.ai_logs;
CREATE POLICY "Only admins can view AI logs"
  ON public.ai_logs FOR SELECT USING (public.is_admin_from_jwt());

-- ====== app_settings ======
DROP POLICY IF EXISTS "Admin full access app_settings" ON public.app_settings;
CREATE POLICY "Admin full access app_settings"
  ON public.app_settings FOR ALL USING (public.is_admin_from_jwt());

-- ====== check_in_events ======
DROP POLICY IF EXISTS "Admins can view all check-in events" ON public.check_in_events;
CREATE POLICY "Admins can view all check-in events"
  ON public.check_in_events FOR SELECT USING (public.is_admin_from_jwt());

-- ====== complaints ======
DROP POLICY IF EXISTS "Admins can view all complaints" ON public.complaints;
CREATE POLICY "Admins can view all complaints"
  ON public.complaints FOR SELECT USING (public.is_admin_from_jwt());

-- ====== feature_flags ======
DROP POLICY IF EXISTS "Admin full access feature_flags" ON public.feature_flags;
CREATE POLICY "Admin full access feature_flags"
  ON public.feature_flags FOR ALL USING (public.is_admin_from_jwt());

-- ====== gateway_configs ======
DROP POLICY IF EXISTS "Admin full access gateway_configs" ON public.gateway_configs;
CREATE POLICY "Admin full access gateway_configs"
  ON public.gateway_configs FOR ALL USING (public.is_admin_from_jwt());

-- ====== kyc_documents ======
DROP POLICY IF EXISTS "Admins can insert KYC documents" ON public.kyc_documents;
CREATE POLICY "Admins can insert KYC documents"
  ON public.kyc_documents FOR INSERT WITH CHECK (public.is_admin_from_jwt());

DROP POLICY IF EXISTS "Admins can view all KYC documents" ON public.kyc_documents;
CREATE POLICY "Admins can view all KYC documents"
  ON public.kyc_documents FOR SELECT USING (public.is_admin_from_jwt());

-- ====== ledger_entries ======
DROP POLICY IF EXISTS "Admin full access ledger_entries" ON public.ledger_entries;
CREATE POLICY "Admin full access ledger_entries"
  ON public.ledger_entries FOR ALL USING (public.is_admin_from_jwt());

-- ====== orders ======
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
CREATE POLICY "Admins can manage all orders"
  ON public.orders FOR ALL USING (public.is_admin_from_jwt());

-- ====== payment_intents ======
DROP POLICY IF EXISTS "Admin full access payment_intents" ON public.payment_intents;
CREATE POLICY "Admin full access payment_intents"
  ON public.payment_intents FOR ALL USING (public.is_admin_from_jwt());

DROP POLICY IF EXISTS "System updates payment intents" ON public.payment_intents;
CREATE POLICY "System updates payment intents"
  ON public.payment_intents FOR SELECT USING (
    (auth.uid() = user_id) OR public.is_admin_from_jwt()
  );

-- ====== payouts ======
DROP POLICY IF EXISTS "Admin full access payouts" ON public.payouts;
CREATE POLICY "Admin full access payouts"
  ON public.payouts FOR ALL USING (public.is_admin_from_jwt());

DROP POLICY IF EXISTS "Admins can view all payouts" ON public.payouts;
CREATE POLICY "Admins can view all payouts"
  ON public.payouts FOR SELECT USING (public.is_admin_from_jwt());

-- ====== profiles ======
-- Already fixed by 20260517000004, verify policies are correct
-- "Admins can view all profiles" should use auth.jwt() already

-- ====== refund_requests ======
DROP POLICY IF EXISTS "Admins can manage all refunds" ON public.refund_requests;
CREATE POLICY "Admins can manage all refunds"
  ON public.refund_requests FOR ALL USING (public.is_admin_from_jwt());

-- ====== trust_scores ======
DROP POLICY IF EXISTS "Admins can manage trust scores" ON public.trust_scores;
CREATE POLICY "Admins can manage trust scores"
  ON public.trust_scores FOR ALL USING (public.is_admin_from_jwt());

-- ====== user_preferences ======
DROP POLICY IF EXISTS "Admin full access user_preferences" ON public.user_preferences;
CREATE POLICY "Admin full access user_preferences"
  ON public.user_preferences FOR ALL USING (public.is_admin_from_jwt());

-- ====== verification_badges ======
DROP POLICY IF EXISTS "Admins can manage badges" ON public.verification_badges;
CREATE POLICY "Admins can manage badges"
  ON public.verification_badges FOR ALL USING (public.is_admin_from_jwt());

-- ====== wallets ======
DROP POLICY IF EXISTS "Admin full access wallets" ON public.wallets;
CREATE POLICY "Admin full access wallets"
  ON public.wallets FOR ALL USING (public.is_admin_from_jwt());

-- ====== warranty_claims ======
DROP POLICY IF EXISTS "Admins can view all warranty claims" ON public.warranty_claims;
CREATE POLICY "Admins can view all warranty claims"
  ON public.warranty_claims FOR SELECT USING (public.is_admin_from_jwt());

-- ====== webhook_events ======
DROP POLICY IF EXISTS "Admin full access webhook_events" ON public.webhook_events;
CREATE POLICY "Admin full access webhook_events"
  ON public.webhook_events FOR ALL USING (public.is_admin_from_jwt());

DROP POLICY IF EXISTS "Admins manage webhooks" ON public.webhook_events;
CREATE POLICY "Admins manage webhooks"
  ON public.webhook_events FOR ALL USING (public.is_admin_from_jwt());

-- ====== workers ======
DROP POLICY IF EXISTS "Admins can manage all worker profiles" ON public.workers;
CREATE POLICY "Admins can manage all worker profiles"
  ON public.workers FOR ALL USING (public.is_admin_from_jwt());

-- ====== worker_portfolio ======
DROP POLICY IF EXISTS "Anyone can view public portfolio" ON public.worker_portfolio;
CREATE POLICY "Anyone can view public portfolio"
  ON public.worker_portfolio FOR SELECT USING (
    (is_public = true) OR (auth.uid() = worker_id) OR public.is_admin_from_jwt()
  );
