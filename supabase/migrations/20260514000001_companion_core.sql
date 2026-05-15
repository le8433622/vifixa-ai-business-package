-- Migration 001: Companion Core
-- AI Companion: mỗi user có 1 AI cá nhân, có trí nhớ, có cá tính

-- ========== UTILITY: updated_at trigger ==========
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========== 1. COMPANION PROFILES ==========
CREATE TABLE IF NOT EXISTS companion_profiles (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  persona     TEXT NOT NULL CHECK (persona IN ('customer', 'worker', 'admin')),
  display_name TEXT NOT NULL DEFAULT 'Vifixa',
  personality JSONB NOT NULL DEFAULT '{}',
  avatar_emoji TEXT DEFAULT '🤖',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
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

-- ========== 2. COMPANION MEMORIES ==========
CREATE TABLE IF NOT EXISTS companion_memories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key         TEXT NOT NULL,
  value       TEXT NOT NULL,
  category    TEXT DEFAULT 'general',
  importance  INT DEFAULT 1 CHECK (importance BETWEEN 1 AND 5),
  source      TEXT DEFAULT 'ai',
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
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

-- ========== 3. COMPANION INTERACTIONS ==========
CREATE TABLE IF NOT EXISTS companion_interactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id  UUID NOT NULL DEFAULT gen_random_uuid(),
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content     TEXT NOT NULL,
  intent      TEXT,
  sentiment   NUMERIC,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
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

-- ========== 4. CUSTOMER DEVICES ==========
CREATE TABLE IF NOT EXISTS customer_devices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL,
  brand         TEXT,
  model         TEXT,
  install_date  DATE,
  warranty_exp  DATE,
  last_service  DATE,
  notes         JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_customer ON customer_devices(customer_id);
CREATE INDEX IF NOT EXISTS idx_devices_category ON customer_devices(customer_id, category);

ALTER TABLE customer_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own devices"
  ON customer_devices FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can insert own devices"
  ON customer_devices FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update own devices"
  ON customer_devices FOR UPDATE
  USING (auth.uid() = customer_id);

DROP TRIGGER IF EXISTS trigger_customer_devices_updated_at ON customer_devices;
CREATE TRIGGER trigger_customer_devices_updated_at
  BEFORE UPDATE ON customer_devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== 5. WORKER SKILLS ==========
CREATE TABLE IF NOT EXISTS worker_skills (
  worker_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  skill         TEXT NOT NULL,
  level         INT CHECK (level BETWEEN 1 AND 5),
  verified      BOOLEAN DEFAULT false,
  completed_jobs INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (worker_id, skill)
);

CREATE INDEX IF NOT EXISTS idx_skills_worker ON worker_skills(worker_id);
CREATE INDEX IF NOT EXISTS idx_skills_skill ON worker_skills(skill);

ALTER TABLE worker_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can manage own skills"
  ON worker_skills FOR ALL
  USING (auth.uid() = worker_id);

CREATE POLICY "Anyone can view verified skills"
  ON worker_skills FOR SELECT
  USING (verified = true OR auth.uid() = worker_id);

DROP TRIGGER IF EXISTS trigger_worker_skills_updated_at ON worker_skills;
CREATE TRIGGER trigger_worker_skills_updated_at
  BEFORE UPDATE ON worker_skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== GRANTS (Supabase PostgREST) ==========
GRANT ALL ON companion_profiles, companion_memories, companion_interactions, customer_devices, worker_skills TO service_role;
GRANT SELECT, INSERT ON companion_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON companion_memories TO authenticated;
GRANT SELECT, INSERT ON companion_interactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON customer_devices TO authenticated;
GRANT SELECT, INSERT, UPDATE ON worker_skills TO authenticated;