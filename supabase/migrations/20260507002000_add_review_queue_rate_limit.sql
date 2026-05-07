-- Admin review queue for AI decisions needing human oversight
-- Rate limiting configuration for Edge Functions

CREATE TABLE IF NOT EXISTS public.admin_review_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('dispute', 'order', 'fraud', 'quality', 'pricing')),
  entity_id TEXT NOT NULL,
  ai_decision JSONB NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'escalated')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_queue_status ON public.admin_review_queue(review_status);
CREATE INDEX IF NOT EXISTS idx_review_queue_entity ON public.admin_review_queue(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_review_queue_created ON public.admin_review_queue(created_at DESC);

ALTER TABLE public.admin_review_queue ENABLE ROW LEVEL SECURITY;

-- Admins can see all, users see their own created
CREATE POLICY "Admins can see all review queue"
  ON public.admin_review_queue FOR SELECT
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

CREATE POLICY "Users can see own review requests"
  ON public.admin_review_queue FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Service role can insert"
  ON public.admin_review_queue FOR INSERT
  WITH CHECK (true);

GRANT SELECT ON public.admin_review_queue TO authenticated;
GRANT INSERT ON public.admin_review_queue TO service_role;

-- Profile role column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'worker', 'admin'));
