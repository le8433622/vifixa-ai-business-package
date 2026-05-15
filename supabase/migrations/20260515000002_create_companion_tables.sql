-- Migration: Create companion tables if they don't exist
-- Based on 20260514000001_companion_core.sql from the current migrations

-- ========== UTILITY: updated_at trigger ==========
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========== 1. COMPANION PROFILES ==========
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companion_profiles') THEN
    CREATE TABLE companion_profiles (
      user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      persona TEXT NOT NULL CHECK (persona IN ('customer', 'worker', 'admin')),
      display_name TEXT NOT NULL DEFAULT 'Vifixa',
      personality JSONB NOT NULL DEFAULT '{}',
      avatar_emoji TEXT DEFAULT '🤖',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE companion_profiles ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view own companion"
      ON companion_profiles FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "System can manage companions"
      ON companion_profiles FOR ALL
      USING (auth.role() = 'service_role');

    DROP TRIGGER IF EXISTS trigger_companion_profiles_updated_at ON companion_profiles;
    CREATE TRIGGER trigger_companion_profiles_updated_at
      BEFORE UPDATE ON companion_profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ========== 2. COMPANION MEMORIES ==========
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companion_memories') THEN
    CREATE TABLE companion_memories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      importance INT DEFAULT 1 CHECK (importance BETWEEN 1 AND 5),
      source TEXT DEFAULT 'ai',
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, key)
    );

    CREATE INDEX IF NOT EXISTS idx_memories_user ON companion_memories(user_id);
    CREATE INDEX IF NOT EXISTS idx_memories_category ON companion_memories(user_id, category);

    ALTER TABLE companion_memories ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view own memories"
      ON companion_memories FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "System can manage memories"
      ON companion_memories FOR ALL
      USING (auth.role() = 'service_role');

    DROP TRIGGER IF EXISTS trigger_companion_memories_updated_at ON companion_memories;
    CREATE TRIGGER trigger_companion_memories_updated_at
      BEFORE UPDATE ON companion_memories
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ========== 3. COMPANION INTERACTIONS ==========
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companion_interactions') THEN
    CREATE TABLE companion_interactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      session_id UUID NOT NULL DEFAULT gen_random_uuid(),
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      intent TEXT,
      sentiment NUMERIC,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_interactions_user ON companion_interactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_interactions_session ON companion_interactions(session_id);
    CREATE INDEX IF NOT EXISTS idx_interactions_created ON companion_interactions(created_at DESC);

    ALTER TABLE companion_interactions ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view own interactions"
      ON companion_interactions FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "System can manage interactions"
      ON companion_interactions FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ========== 4. COMPANION SESSIONS (for tracking chat sessions) ==========
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companion_sessions') THEN
    CREATE TABLE companion_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      persona TEXT NOT NULL CHECK (persona IN ('customer', 'worker', 'admin')),
      context JSONB DEFAULT '{}',
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
      started_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON companion_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON companion_sessions(status);

    ALTER TABLE companion_sessions ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view own sessions"
      ON companion_sessions FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "System can manage sessions"
      ON companion_sessions FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ========== 5. GRANT PERMISSIONS ==========
GRANT ALL ON companion_profiles, companion_memories, companion_interactions, companion_sessions TO service_role;
GRANT SELECT, INSERT ON companion_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON companion_memories TO authenticated;
GRANT SELECT, INSERT ON companion_interactions TO authenticated;
GRANT SELECT, INSERT ON companion_sessions TO authenticated;