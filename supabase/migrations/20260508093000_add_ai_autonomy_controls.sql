-- AI autonomy controls: support autonomous execution and human-approved manual/supervised modes.

ALTER TABLE public.chat_events
  DROP CONSTRAINT IF EXISTS chat_events_event_type_check;

ALTER TABLE public.chat_events
  ADD CONSTRAINT chat_events_event_type_check
  CHECK (event_type IN (
    'chat_started',
    'slot_updated',
    'quote_shown',
    'confirmation_shown',
    'confirmation_clicked',
    'order_created',
    'approval_requested',
    'escalated',
    'abandoned'
  ));

CREATE TABLE IF NOT EXISTS public.ai_autonomy_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scope_type TEXT NOT NULL DEFAULT 'global' CHECK (scope_type IN ('global', 'category')),
  scope_value TEXT NOT NULL DEFAULT 'global',
  mode TEXT NOT NULL DEFAULT 'autonomous' CHECK (mode IN ('autonomous', 'supervised', 'manual')),
  min_confidence NUMERIC NOT NULL DEFAULT 0.60,
  max_auto_order_value NUMERIC NOT NULL DEFAULT 2000000,
  allow_safety_risk BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_autonomy_policies_scope
  ON public.ai_autonomy_policies(scope_type, scope_value, is_active);

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_ai_autonomy_policy_scope
  ON public.ai_autonomy_policies(scope_type, scope_value)
  WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.ai_action_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('create_order', 'assign_worker', 'cancel_order', 'refund', 'resolve_dispute')),
  action_payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'blocked')),
  approval_mode TEXT NOT NULL CHECK (approval_mode IN ('autonomous', 'supervised', 'manual')),
  decision_reason TEXT NOT NULL,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_ai_action_request_idempotency
  ON public.ai_action_requests(request_id, action_type);
CREATE INDEX IF NOT EXISTS idx_ai_action_requests_status_created
  ON public.ai_action_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_action_requests_session
  ON public.ai_action_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_action_requests_user
  ON public.ai_action_requests(user_id);

ALTER TABLE public.ai_autonomy_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_action_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage AI autonomy policies"
  ON public.ai_autonomy_policies FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Users can view own AI action requests"
  ON public.ai_action_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all AI action requests"
  ON public.ai_action_requests FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

GRANT SELECT ON public.ai_autonomy_policies TO authenticated;
GRANT ALL ON public.ai_autonomy_policies TO service_role;
GRANT SELECT ON public.ai_action_requests TO authenticated;
GRANT ALL ON public.ai_action_requests TO service_role;

INSERT INTO public.ai_autonomy_policies (
  scope_type,
  scope_value,
  mode,
  min_confidence,
  max_auto_order_value,
  allow_safety_risk,
  is_active
)
VALUES ('global', 'global', 'autonomous', 0.60, 2000000, false, true)
ON CONFLICT DO NOTHING;
