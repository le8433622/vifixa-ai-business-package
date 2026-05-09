-- Persist chat funnel events for AI Chat Service Closer analytics and audit.
CREATE TABLE IF NOT EXISTS public.chat_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'chat_started',
    'slot_updated',
    'quote_shown',
    'confirmation_shown',
    'confirmation_clicked',
    'order_created',
    'escalated',
    'abandoned'
  )),
  state TEXT,
  intent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_events_session_id ON public.chat_events(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_events_user_id ON public.chat_events(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_events_type_created ON public.chat_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_events_created_at ON public.chat_events(created_at DESC);

ALTER TABLE public.chat_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat events"
  ON public.chat_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Workers can view chat events for assigned orders"
  ON public.chat_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.chat_session_id = chat_events.session_id
      AND orders.worker_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all chat events"
  ON public.chat_events FOR SELECT
  USING (is_admin());

GRANT SELECT ON public.chat_events TO authenticated;
GRANT ALL ON public.chat_events TO service_role;
