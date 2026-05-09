-- Migration: Create A/B testing tables
-- Date: 2026-05-10
-- Purpose: A/B testing framework for smart suggestions

-- ========== 1. AB_TESTS ==========
CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name TEXT NOT NULL,
  description TEXT,
  variant_a JSONB NOT NULL,       -- Configuration for variant A
  variant_b JSONB NOT NULL,       -- Configuration for variant B
  traffic_split INTEGER DEFAULT 50,  -- % of users going to variant B (0-100)
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ab_tests_active ON ab_tests(active) WHERE active = true;

ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access ab_tests" ON ab_tests;
CREATE POLICY "Admin full access ab_tests" ON ab_tests
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Service role can manage ab_tests" ON ab_tests;
CREATE POLICY "Service role can manage ab_tests" ON ab_tests
  FOR ALL USING (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS trigger_ab_tests_updated_at ON ab_tests;
CREATE TRIGGER trigger_ab_tests_updated_at
  BEFORE UPDATE ON ab_tests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== 2. AB_TEST_CONVERSIONS ==========
CREATE TABLE IF NOT EXISTS ab_test_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ab_test_id UUID REFERENCES ab_tests(id),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  suggestion_id UUID REFERENCES user_suggestions(id),
  variant TEXT NOT NULL CHECK (variant IN ('variant_a', 'variant_b')),
  converted BOOLEAN DEFAULT false,
  dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ab_conversions_test ON ab_test_conversions(ab_test_id);
CREATE INDEX IF NOT EXISTS idx_ab_conversions_user ON ab_test_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_conversions_pending ON ab_test_conversions(converted, dismissed) WHERE converted = false AND dismissed = false;

ALTER TABLE ab_test_conversions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own conversions" ON ab_test_conversions;
CREATE POLICY "Users can insert own conversions" ON ab_test_conversions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own conversions" ON ab_test_conversions;
CREATE POLICY "Users can view own conversions" ON ab_test_conversions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage ab_test_conversions" ON ab_test_conversions;
CREATE POLICY "Service role can manage ab_test_conversions" ON ab_test_conversions
  FOR ALL USING (auth.role() = 'service_role');

-- ========== 3. GRANT PERMISSIONS ==========
GRANT ALL ON ab_tests, ab_test_conversions TO service_role;
GRANT SELECT, INSERT ON ab_test_conversions TO authenticated;
