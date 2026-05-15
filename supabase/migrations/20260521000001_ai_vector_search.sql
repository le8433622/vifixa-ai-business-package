-- AI Vector Search — embeddings table (JSONB approach, no pgvector dependency)
-- Note: Upgrade to pgvector when available: go to Supabase > Database > Extensions > enable vector

CREATE TABLE IF NOT EXISTS public.ai_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL CHECK (content_type IN ('worker', 'service', 'order', 'knowledge_base')),
  content_id UUID NOT NULL,
  embedding JSONB NOT NULL DEFAULT '[]',
  content_text TEXT NOT NULL,
  source TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_embeddings_type ON public.ai_embeddings(content_type);

ALTER TABLE public.ai_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can search embeddings" ON public.ai_embeddings
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage embeddings" ON public.ai_embeddings
  FOR ALL USING (auth.role() = 'service_role');

GRANT SELECT ON public.ai_embeddings TO authenticated, anon;
GRANT ALL ON public.ai_embeddings TO service_role;