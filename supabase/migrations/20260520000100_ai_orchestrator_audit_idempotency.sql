-- AI Orchestrator audit and idempotency layer
-- Keeps AI runtime observable before enabling any write/mutation actions.

CREATE TABLE IF NOT EXISTS public.ai_orchestrator_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  persona TEXT,
  tool TEXT,
  mode TEXT NOT NULL DEFAULT 'readonly',
  risk TEXT NOT NULL DEFAULT 'low',
  decision TEXT NOT NULL DEFAULT 'allow',
  status TEXT NOT NULL DEFAULT 'success',
  reason TEXT,
  input_redacted JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_redacted JSONB,
  latency_ms INTEGER,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_orchestrator_audit_logs_action_check CHECK (char_length(action) <= 120),
  CONSTRAINT ai_orchestrator_audit_logs_mode_check CHECK (mode IN ('readonly', 'proposal_only', 'blocked', 'simulate', 'execute')),
  CONSTRAINT ai_orchestrator_audit_logs_risk_check CHECK (risk IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT ai_orchestrator_audit_logs_decision_check CHECK (decision IN ('allow', 'deny', 'simulate', 'block')),
  CONSTRAINT ai_orchestrator_audit_logs_status_check CHECK (status IN ('success', 'error', 'denied', 'cached'))
);

CREATE INDEX IF NOT EXISTS idx_ai_orchestrator_audit_logs_user_created
  ON public.ai_orchestrator_audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_orchestrator_audit_logs_request
  ON public.ai_orchestrator_audit_logs(request_id);

CREATE INDEX IF NOT EXISTS idx_ai_orchestrator_audit_logs_action_created
  ON public.ai_orchestrator_audit_logs(action, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_orchestrator_idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  action TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_body JSONB NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 200,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_orchestrator_idempotency_key_len CHECK (char_length(idempotency_key) BETWEEN 8 AND 200),
  CONSTRAINT ai_orchestrator_idempotency_status_code_check CHECK (status_code BETWEEN 100 AND 599),
  CONSTRAINT ai_orchestrator_idempotency_unique UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_orchestrator_idempotency_expires
  ON public.ai_orchestrator_idempotency_keys(expires_at);

CREATE INDEX IF NOT EXISTS idx_ai_orchestrator_idempotency_user_created
  ON public.ai_orchestrator_idempotency_keys(user_id, created_at DESC);

ALTER TABLE public.ai_orchestrator_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_orchestrator_idempotency_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own AI orchestrator audit logs" ON public.ai_orchestrator_audit_logs;
CREATE POLICY "Users can read own AI orchestrator audit logs"
  ON public.ai_orchestrator_audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own AI orchestrator idempotency keys" ON public.ai_orchestrator_idempotency_keys;
CREATE POLICY "Users can read own AI orchestrator idempotency keys"
  ON public.ai_orchestrator_idempotency_keys
  FOR SELECT
  USING (auth.uid() = user_id);

-- Inserts and updates are intentionally not granted to regular clients.
-- Edge Functions write through service role after Supabase Auth verification.

CREATE OR REPLACE FUNCTION public.set_ai_orchestrator_idempotency_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_orchestrator_idempotency_updated_at
  ON public.ai_orchestrator_idempotency_keys;

CREATE TRIGGER trg_ai_orchestrator_idempotency_updated_at
  BEFORE UPDATE ON public.ai_orchestrator_idempotency_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ai_orchestrator_idempotency_updated_at();
