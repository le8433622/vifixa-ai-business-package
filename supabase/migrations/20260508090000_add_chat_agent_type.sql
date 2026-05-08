-- Allow ai_logs to audit AI chat service-closer decisions.
ALTER TABLE public.ai_logs
  DROP CONSTRAINT IF EXISTS ai_logs_agent_type_check;

ALTER TABLE public.ai_logs
  ADD CONSTRAINT ai_logs_agent_type_check
  CHECK (agent_type IN ('diagnosis', 'pricing', 'matching', 'quality', 'dispute', 'coach', 'fraud', 'chat'));
