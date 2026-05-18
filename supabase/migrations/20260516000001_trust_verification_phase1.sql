-- Phase 1: Trust & Verification
-- Worker KYC, Customer OTP, Verification Badge, CV/Portfolio, Trust Score Engine

-- ========== 1. KYC columns for workers ==========
ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS selfie_url TEXT,
  ADD COLUMN IF NOT EXISTS id_front_url TEXT,
  ADD COLUMN IF NOT EXISTS id_back_url TEXT,
  ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kyc_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kyc_reviewed_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS kyc_notes TEXT;

-- ========== 2. Phone verified for profiles ==========
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;

-- ========== 3. KYC Documents table (review history) ==========
CREATE TABLE IF NOT EXISTS kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE NOT NULL,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('cmnd_front', 'cmnd_back', 'cccd_front', 'cccd_back', 'selfie', 'passport', 'other')),
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_documents_worker ON kyc_documents(worker_id);

ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can view own KYC documents"
  ON kyc_documents FOR SELECT
  USING (auth.uid() = worker_id);

CREATE POLICY "Admins can view all KYC documents"
  ON kyc_documents FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can insert KYC documents"
  ON kyc_documents FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ========== 4. Worker Portfolio table ==========
CREATE TABLE IF NOT EXISTS worker_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('before_after', 'certificate', 'worksample', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  tags JSONB DEFAULT '[]',
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worker_portfolio_worker ON worker_portfolio(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_portfolio_public ON worker_portfolio(worker_id) WHERE is_public = TRUE;

ALTER TABLE worker_portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can manage own portfolio"
  ON worker_portfolio FOR ALL
  USING (auth.uid() = worker_id);

CREATE POLICY "Anyone can view public portfolio"
  ON worker_portfolio FOR SELECT
  USING (is_public = TRUE OR auth.uid() = worker_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ========== 5. OTP Codes table ==========
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  phone TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('phone_verification', 'password_reset', 'login')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_user ON otp_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires ON otp_codes(expires_at);

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own OTP codes"
  ON otp_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage OTP codes"
  ON otp_codes FOR ALL
  USING (auth.role() = 'service_role');

-- ========== 6. Verification Badge tracking ==========
CREATE TABLE IF NOT EXISTS verification_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_type TEXT NOT NULL CHECK (badge_type IN ('identity', 'phone', 'skill', 'premium')),
  badge_level TEXT NOT NULL CHECK (badge_level IN ('bronze', 'silver', 'gold', 'platinum')),
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  UNIQUE(user_id, badge_type)
);

CREATE INDEX IF NOT EXISTS idx_verification_badges_user ON verification_badges(user_id);

ALTER TABLE verification_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own badges"
  ON verification_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view identity badges"
  ON verification_badges FOR SELECT
  USING (badge_type = 'identity');

CREATE POLICY "Admins can manage badges"
  ON verification_badges FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ========== 7. Trust Score Engine ==========

-- Calculate trust score based on multiple factors
-- Formula: base 60 + (completed_orders * 2) + (avg_rating * 8) - (dispute_rate * 10) capped at 0-100
CREATE OR REPLACE FUNCTION calculate_trust_score(worker_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_orders INTEGER;
  v_avg_rating NUMERIC;
  v_dispute_rate NUMERIC;
  v_completed_count INTEGER;
  v_disputed_count INTEGER;
  v_new_score INTEGER;
BEGIN
  IF auth.uid() != worker_uuid AND NOT public.is_admin_from_jwt() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Get worker stats
  SELECT
    COUNT(*) FILTER (WHERE status = 'completed'),
    COALESCE(AVG(rating) FILTER (WHERE rating IS NOT NULL), 0),
    COUNT(*) FILTER (WHERE status = 'disputed')
  INTO
    v_completed_count,
    v_avg_rating,
    v_disputed_count
  FROM orders
  WHERE worker_id = worker_uuid;

  v_total_orders := v_completed_count + v_disputed_count;
  v_dispute_rate := CASE WHEN v_total_orders > 0 THEN (v_disputed_count::NUMERIC / v_total_orders) ELSE 0 END;

  -- Formula: base 60 + per-order bonus + rating bonus - dispute penalty
  v_new_score := 60
    + LEAST(v_completed_count * 2, 20)
    + FLOOR(COALESCE(v_avg_rating, 0) * 8)
    - FLOOR(v_dispute_rate * 30);

  -- Clamp between 0 and 100
  v_new_score := GREATEST(0, LEAST(100, v_new_score));

  -- Update workers table
  UPDATE workers
  SET
    trust_score = v_new_score,
    total_orders = v_total_orders,
    avg_rating = v_avg_rating,
    dispute_rate = v_dispute_rate,
    updated_at = NOW()
  WHERE id = worker_uuid;

  -- Insert history record
  INSERT INTO trust_scores (worker_id, completed_orders, avg_rating, dispute_rate, last_calculated)
  VALUES (worker_uuid, v_completed_count, v_avg_rating, v_dispute_rate, NOW())
  ON CONFLICT (id) DO UPDATE SET
    completed_orders = v_completed_count,
    avg_rating = v_avg_rating,
    dispute_rate = v_dispute_rate,
    last_calculated = NOW();

  RETURN v_new_score;
END;
$$;

-- ========== 8. Trigger: Auto recalculate trust score on order completion ==========
CREATE OR REPLACE FUNCTION trigger_recalculate_trust_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM calculate_trust_score(NEW.worker_id);
  END IF;

  IF NEW.status = 'disputed' AND (OLD.status IS NULL OR OLD.status != 'disputed') THEN
    PERFORM calculate_trust_score(NEW.worker_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_trust_score ON orders;
CREATE TRIGGER trg_order_trust_score
  AFTER INSERT OR UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (NEW.worker_id IS NOT NULL)
  EXECUTE FUNCTION trigger_recalculate_trust_score();

-- ========== 9. RPC wrapper for Edge Functions ==========
CREATE OR REPLACE FUNCTION recalculate_trust_score(worker_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() != worker_uuid AND NOT public.is_admin_from_jwt() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN calculate_trust_score(worker_uuid);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_trust_score TO service_role;
GRANT EXECUTE ON FUNCTION recalculate_trust_score TO service_role;
GRANT EXECUTE ON FUNCTION calculate_trust_score TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_trust_score TO authenticated;

-- ========== 10. Seed verification-docs bucket (via SQL workaround) ==========
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('verification-docs', 'verification-docs', FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated uploads to verification-docs
CREATE POLICY "Authenticated users can upload verification docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view own verification docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-docs'
    AND (auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
