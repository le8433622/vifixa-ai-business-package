CREATE TABLE IF NOT EXISTS public.cron_job_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'succeeded', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  result_summary TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE public.cron_job_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read cron logs" ON public.cron_job_log;
CREATE POLICY "Admin read cron logs"
  ON public.cron_job_log FOR SELECT
  USING (public.is_admin_from_jwt());
