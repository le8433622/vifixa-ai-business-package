-- Migration: User push tokens for Expo Push Notifications
-- Date: 2026-05-18

CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, push_token)
);

ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push tokens"
  ON public.user_push_tokens FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all tokens"
  ON public.user_push_tokens FOR ALL
  USING (true);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON public.user_push_tokens(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON public.user_push_tokens(push_token);

CREATE TRIGGER update_user_push_tokens_updated_at BEFORE UPDATE ON public.user_push_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
