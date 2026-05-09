-- Migration: Create smart system tables
-- Date: 2026-05-10
-- Purpose: User preferences, behavioral patterns, smart suggestions

-- ========== 1. USER_PREFERENCES ==========
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  preference_key TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, preference_key)
);

CREATE INDEX IF NOT EXISTS idx_user_prefs_user ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_prefs_key ON user_preferences(preference_key);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own preferences" ON user_preferences;
CREATE POLICY "Users can manage own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin full access user_preferences" ON user_preferences;
CREATE POLICY "Admin full access user_preferences" ON user_preferences
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

DROP TRIGGER IF EXISTS trigger_user_prefs_updated_at ON user_preferences;
CREATE TRIGGER trigger_user_prefs_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== 2. BEHAVIORAL_PATTERNS ==========
CREATE TABLE IF NOT EXISTS behavioral_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  pattern_type TEXT NOT NULL,       -- 'work_hours', 'job_types', 'earnings'
  pattern_data JSONB NOT NULL,
  confidence FLOAT DEFAULT 0.0,
  last_updated TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, pattern_type)
);

CREATE INDEX IF NOT EXISTS idx_behavior_user ON behavioral_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_behavior_type ON behavioral_patterns(pattern_type);

ALTER TABLE behavioral_patterns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own patterns" ON behavioral_patterns;
CREATE POLICY "Users can view own patterns" ON behavioral_patterns
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage patterns" ON behavioral_patterns;
CREATE POLICY "Service role can manage patterns" ON behavioral_patterns
  FOR ALL USING (auth.role() = 'service_role');

-- ========== 3. USER_SUGGESTIONS ==========
CREATE TABLE IF NOT EXISTS user_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  suggestion_type TEXT NOT NULL,     -- 'preference', 'work_pattern', 'earnings'
  suggestion JSONB NOT NULL,
  confidence FLOAT DEFAULT 0.5,
  applied BOOLEAN DEFAULT false,
  dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  applied_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_suggestions_user ON user_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_applied ON user_suggestions(applied) WHERE applied = false;
CREATE INDEX IF NOT EXISTS idx_suggestions_dismissed ON user_suggestions(dismissed) WHERE dismissed = false;

ALTER TABLE user_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own suggestions" ON user_suggestions;
CREATE POLICY "Users can view own suggestions" ON user_suggestions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own suggestions" ON user_suggestions;
CREATE POLICY "Users can update own suggestions" ON user_suggestions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage suggestions" ON user_suggestions;
CREATE POLICY "Service role can manage suggestions" ON user_suggestions
  FOR ALL USING (auth.role() = 'service_role');

-- ========== 4. GRANT PERMISSIONS ==========
GRANT ALL ON user_preferences, behavioral_patterns, user_suggestions TO service_role;
GRANT SELECT, INSERT, UPDATE ON user_preferences TO authenticated;
GRANT SELECT ON behavioral_patterns TO authenticated;
GRANT SELECT, UPDATE ON user_suggestions TO authenticated;
