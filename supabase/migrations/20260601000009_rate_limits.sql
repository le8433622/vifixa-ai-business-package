-- Rate limiter table for persistent rate limiting
-- Replaces in-memory Map to survive restarts and scale multi-instance

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  count INT DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limits_service" ON public.rate_limits
  USING (auth.role() = 'service_role');

-- Periodic cleanup RPC
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS INT AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM public.rate_limits WHERE window_start < NOW() - INTERVAL '5 minutes';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
