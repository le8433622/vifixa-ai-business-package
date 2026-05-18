-- Agent OS Core Tables
-- Phase 17: Agent Operating System Foundation
-- Tables: agent_goals, agent_runs, agent_steps, agent_actions, agent_policies, agent_approvals

-- ========== 1. AGENT GOALS ==========
CREATE TABLE IF NOT EXISTS agent_goals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) NOT NULL,
  persona          TEXT NOT NULL CHECK (persona IN ('customer', 'worker', 'admin')),
  goal_type        TEXT NOT NULL,
  goal_description TEXT NOT NULL,
  service_id       TEXT,
  status           TEXT DEFAULT 'active' CHECK (status IN ('active', 'in_progress', 'completed', 'failed', 'cancelled')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  completed_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_goals_user ON agent_goals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goals_status ON agent_goals(user_id, status);

ALTER TABLE agent_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own goals"
  ON agent_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System creates goals"
  ON agent_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System updates goals"
  ON agent_goals FOR UPDATE
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ========== 2. AGENT RUNS ==========
CREATE TABLE IF NOT EXISTS agent_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id          UUID REFERENCES agent_goals(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES auth.users(id) NOT NULL,
  persona          TEXT NOT NULL,
  plan             JSONB NOT NULL DEFAULT '[]',
  current_step     INTEGER DEFAULT 0,
  status           TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  completed_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_runs_user ON agent_runs(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_goal ON agent_runs(goal_id);
CREATE INDEX IF NOT EXISTS idx_runs_status ON agent_runs(status);

ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own runs"
  ON agent_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System creates runs"
  ON agent_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System updates runs"
  ON agent_runs FOR UPDATE
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ========== 3. AGENT STEPS ==========
CREATE TABLE IF NOT EXISTS agent_steps (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id           UUID REFERENCES agent_runs(id) ON DELETE CASCADE,
  step_index       INTEGER NOT NULL,
  action_id        TEXT NOT NULL,
  action_input     JSONB,
  action_output    JSONB,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped', 'waiting_approval')),
  error_message    TEXT,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_steps_run ON agent_steps(run_id, step_index);
CREATE INDEX IF NOT EXISTS idx_steps_status ON agent_steps(status);

ALTER TABLE agent_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own steps"
  ON agent_steps FOR SELECT
  USING (EXISTS (SELECT 1 FROM agent_runs WHERE id = agent_steps.run_id AND user_id = auth.uid()));

CREATE POLICY "System manages steps"
  ON agent_steps FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ========== 4. AGENT ACTIONS (Registry) ==========
CREATE TABLE IF NOT EXISTS agent_actions (
  id               TEXT PRIMARY KEY,
  domain           TEXT NOT NULL,
  name             TEXT NOT NULL,
  description      TEXT NOT NULL,
  input_schema     JSONB NOT NULL DEFAULT '{}',
  output_schema    JSONB NOT NULL DEFAULT '{}',
  handler          TEXT NOT NULL,
  autonomy_level   INTEGER DEFAULT 2 CHECK (autonomy_level BETWEEN 0 AND 5),
  risk_level       TEXT DEFAULT 'safe' CHECK (risk_level IN ('safe', 'medium', 'high', 'critical')),
  confirm_message  TEXT,
  persona          TEXT[] NOT NULL DEFAULT '{}',
  rollback_action  TEXT,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_actions_domain ON agent_actions(domain);
CREATE INDEX IF NOT EXISTS idx_actions_active ON agent_actions(is_active);

-- No RLS needed — read-only registry table, accessed via service_role or public read
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read agent actions"
  ON agent_actions FOR SELECT
  USING (true);

CREATE POLICY "Admin manages agent actions"
  ON agent_actions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ========== 5. AGENT POLICIES ==========
CREATE TABLE IF NOT EXISTS agent_policies (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id            TEXT REFERENCES agent_actions(id),
  persona              TEXT NOT NULL,
  max_autonomy_level   INTEGER DEFAULT 2 CHECK (max_autonomy_level BETWEEN 0 AND 5),
  require_otp          BOOLEAN DEFAULT false,
  require_confirmation BOOLEAN DEFAULT false,
  max_amount           NUMERIC,
  cooldown_seconds     INTEGER DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(action_id, persona)
);

CREATE INDEX IF NOT EXISTS idx_policies_action ON agent_policies(action_id);
CREATE INDEX IF NOT EXISTS idx_policies_persona ON agent_policies(persona);

ALTER TABLE agent_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read agent policies"
  ON agent_policies FOR SELECT
  USING (true);

CREATE POLICY "Admin manages agent policies"
  ON agent_policies FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ========== 6. AGENT APPROVALS ==========
CREATE TABLE IF NOT EXISTS agent_approvals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id          UUID REFERENCES agent_steps(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES auth.users(id) NOT NULL,
  action_id        TEXT NOT NULL,
  action_summary   TEXT NOT NULL,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  approved_by      UUID REFERENCES auth.users(id),
  approved_at      TIMESTAMPTZ,
  rejected_reason  TEXT,
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approvals_user ON agent_approvals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approvals_step ON agent_approvals(step_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON agent_approvals(status);

ALTER TABLE agent_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own approvals"
  ON agent_approvals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System creates approvals"
  ON agent_approvals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users approve/reject own approvals"
  ON agent_approvals FOR UPDATE
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ========== 7. HELPER FUNCTIONS ==========

-- Get effective autonomy level for an action + persona
CREATE OR REPLACE FUNCTION get_effective_autonomy_level(p_action_id TEXT, p_persona TEXT)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_action_level INTEGER;
  v_policy_level INTEGER;
BEGIN
  SELECT autonomy_level INTO v_action_level FROM agent_actions WHERE id = p_action_id AND is_active = true;
  IF v_action_level IS NULL THEN RETURN 0; END IF;

  SELECT max_autonomy_level INTO v_policy_level FROM agent_policies WHERE action_id = p_action_id AND persona = p_persona;
  IF v_policy_level IS NULL THEN RETURN v_action_level; END IF;

  RETURN LEAST(v_action_level, v_policy_level);
END;
$$;

-- Check if an action requires confirmation for a persona
CREATE OR REPLACE FUNCTION action_requires_confirmation(p_action_id TEXT, p_persona TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_require BOOLEAN;
BEGIN
  SELECT require_confirmation INTO v_require FROM agent_policies WHERE action_id = p_action_id AND persona = p_persona;
  RETURN COALESCE(v_require, false);
END;
$$;

-- Check if an action requires OTP for a persona
CREATE OR REPLACE FUNCTION action_requires_otp(p_action_id TEXT, p_persona TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_require BOOLEAN;
BEGIN
  SELECT require_otp INTO v_require FROM agent_policies WHERE action_id = p_action_id AND persona = p_persona;
  RETURN COALESCE(v_require, false);
END;
$$;

-- Expire old approvals (call via cron)
CREATE OR REPLACE FUNCTION expire_old_approvals()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE agent_approvals
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION get_effective_autonomy_level TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION action_requires_confirmation TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION action_requires_otp TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION expire_old_approvals TO service_role;
