-- AI Core Infrastructure v2.0 — Super Smart Upgrade
-- Adds: ai_cache, ai_prompts, ai_feedback, ai_cost_log, ai_material_prices, ai_upsell_rules, ai_embeddings
-- Enhances: ai_logs with cost/model tracking

-- ============================================
-- 1. AI CACHE — Response caching layer
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_hash TEXT NOT NULL UNIQUE,
  agent_type TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version INT NOT NULL DEFAULT 0,
  input JSONB NOT NULL,
  output JSONB NOT NULL,
  tokens_in INT DEFAULT 0,
  tokens_out INT DEFAULT 0,
  cost NUMERIC(10,6) DEFAULT 0,
  latency_ms INT DEFAULT 0,
  hit_count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'),
  last_hit_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_hash ON public.ai_cache(cache_hash);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON public.ai_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_cache_agent ON public.ai_cache(agent_type, created_at DESC);

ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage ai_cache" ON public.ai_cache
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Admins can view ai_cache" ON public.ai_cache
  FOR SELECT USING (is_admin());

-- Auto-cleanup expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_ai_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.ai_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. AI PROMPTS — Versioned prompt management
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_type TEXT NOT NULL,
  version INT NOT NULL,
  model TEXT NOT NULL DEFAULT 'meta/llama-3.1-8b-instruct',
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT,
  temperature NUMERIC(3,2) DEFAULT 0.3,
  max_tokens INT DEFAULT 1024,
  is_active BOOLEAN DEFAULT false,
  changelog TEXT,
  metrics JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_type, version)
);

CREATE INDEX IF NOT EXISTS idx_ai_prompts_active ON public.ai_prompts(agent_type) WHERE is_active = true;

ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ai_prompts" ON public.ai_prompts
  FOR ALL USING (is_admin());

CREATE POLICY "Service role can read ai_prompts" ON public.ai_prompts
  FOR SELECT USING (auth.role() = 'service_role');

GRANT SELECT ON public.ai_prompts TO service_role, authenticated;

-- ============================================
-- 3. AI FEEDBACK — Human feedback on AI decisions
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id TEXT,
  agent_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  is_correct BOOLEAN,
  correction JSONB,
  comment TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_agent ON public.ai_feedback(agent_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user ON public.ai_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_request ON public.ai_feedback(request_id);

ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own feedback" ON public.ai_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback" ON public.ai_feedback
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

GRANT ALL ON public.ai_feedback TO service_role;

-- ============================================
-- 4. AI COST LOG — Granular cost tracking
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_cost_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_in INT DEFAULT 0,
  tokens_out INT DEFAULT 0,
  cost NUMERIC(10,6) NOT NULL DEFAULT 0,
  latency_ms INT DEFAULT 0,
  cache_hit BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_cost_log_date ON public.ai_cost_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_cost_log_agent ON public.ai_cost_log(agent_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_cost_log_request ON public.ai_cost_log(request_id);

ALTER TABLE public.ai_cost_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view ai_cost_log" ON public.ai_cost_log
  FOR SELECT USING (is_admin());

CREATE POLICY "Service role can manage ai_cost_log" ON public.ai_cost_log
  FOR ALL USING (auth.role() = 'service_role');

GRANT SELECT ON public.ai_cost_log TO service_role;

-- ============================================
-- 5. AI MATERIAL PRICES — Material marketplace
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_material_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  material_name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'cái',
  min_price NUMERIC(12,2) NOT NULL,
  max_price NUMERIC(12,2) NOT NULL,
  supplier TEXT,
  affiliate_url TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_material_category ON public.ai_material_prices(category, is_active);

ALTER TABLE public.ai_material_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active materials" ON public.ai_material_prices
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage materials" ON public.ai_material_prices
  FOR ALL USING (is_admin());

GRANT SELECT ON public.ai_material_prices TO authenticated, anon;
GRANT ALL ON public.ai_material_prices TO service_role;

-- ============================================
-- 6. AI UPSELL RULES — Monetization engine
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_upsell_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'after_diagnosis', 'after_quote', 'after_confirmation', 'after_completion',
    'abandoned_cart', 'repeat_customer', 'first_time', 'high_value'
  )),
  target_role TEXT NOT NULL DEFAULT 'customer' CHECK (target_role IN ('customer', 'worker', 'all')),
  suggestion_template TEXT NOT NULL,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  product_type TEXT NOT NULL CHECK (product_type IN (
    'membership', 'warranty', 'premium_worker', 'material_kit', 'maintenance_plan', 'boost_package'
  )),
  priority INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  conditions JSONB DEFAULT '{}',
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_upsell_active ON public.ai_upsell_rules(trigger_type, is_active) WHERE is_active = true;

ALTER TABLE public.ai_upsell_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage upsell rules" ON public.ai_upsell_rules
  FOR ALL USING (is_admin());

CREATE POLICY "Service role can manage upsell rules" ON public.ai_upsell_rules
  FOR ALL USING (auth.role() = 'service_role');

GRANT ALL ON public.ai_upsell_rules TO service_role;

-- ============================================
-- 7. Extend ai_logs with cost & model tracking
-- ============================================
ALTER TABLE public.ai_logs
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS tokens_in INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tokens_out INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost NUMERIC(10,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS latency_ms INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cache_hit BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS prompt_version INT DEFAULT 0;

-- Update agent_type check constraint
ALTER TABLE public.ai_logs
  DROP CONSTRAINT IF EXISTS ai_logs_agent_type_check;

ALTER TABLE public.ai_logs
  ADD CONSTRAINT ai_logs_agent_type_check
  CHECK (agent_type IN (
    'diagnosis', 'pricing', 'matching', 'quality', 'dispute', 'coach', 'fraud',
    'predict', 'care_agent', 'warranty', 'chat', 'upsell', 'b2b', 'materials',
    'news_writer', 'personalize', 'suggestion', 'analytics'
  ));

-- ============================================
-- 8. Daily cost monitoring view
-- ============================================
CREATE OR REPLACE VIEW public.ai_cost_daily AS
SELECT
  created_at::date AS day,
  agent_type,
  COUNT(*)::INT AS total_calls,
  SUM(tokens_in)::INT AS total_tokens_in,
  SUM(tokens_out)::INT AS total_tokens_out,
  ROUND(SUM(cost)::NUMERIC, 4) AS total_cost,
  ROUND(AVG(latency_ms)::NUMERIC, 0) AS avg_latency_ms,
  COUNT(*) FILTER (WHERE cache_hit = true)::INT AS cache_hits,
  ROUND(
    COUNT(*) FILTER (WHERE cache_hit = true)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1
  ) AS cache_hit_pct
FROM public.ai_logs
GROUP BY created_at::date, agent_type
ORDER BY day DESC, total_cost DESC;

-- ============================================
-- 9. Agent accuracy view (using feedback)
-- ============================================
CREATE OR REPLACE VIEW public.ai_agent_accuracy AS
SELECT
  f.agent_type,
  COUNT(*)::INT AS total_feedback,
  COUNT(*) FILTER (WHERE f.is_correct = true)::INT AS correct,
  COUNT(*) FILTER (WHERE f.is_correct = false)::INT AS incorrect,
  ROUND(
    COUNT(*) FILTER (WHERE f.is_correct = true)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1
  ) AS accuracy_pct,
  ROUND(AVG(f.rating)::NUMERIC, 2) AS avg_rating
FROM public.ai_feedback f
GROUP BY f.agent_type
ORDER BY accuracy_pct DESC;

-- ============================================
-- 10. Grants
-- ============================================
GRANT SELECT ON public.ai_cache TO service_role;
-- ============================================
-- 11. RPC: Increment cache hit counter
-- ============================================
CREATE OR REPLACE FUNCTION public.increment_cache_hit(p_hash TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.ai_cache
  SET hit_count = hit_count + 1, last_hit_at = NOW()
  WHERE cache_hash = p_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.increment_cache_hit(TEXT) TO service_role;

-- ============================================
-- 12. RPC: Get daily AI cost summary
-- ============================================
CREATE OR REPLACE FUNCTION public.get_ai_cost_summary(p_days INT DEFAULT 7)
RETURNS TABLE (
  day DATE,
  total_calls INT,
  total_cost NUMERIC,
  avg_latency_ms INT,
  cache_hit_pct NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    created_at::date,
    COUNT(*)::INT,
    ROUND(SUM(COALESCE(cost, 0))::NUMERIC, 4),
    ROUND(AVG(COALESCE(latency_ms, 0))::NUMERIC, 0)::INT,
    ROUND(COUNT(*) FILTER (WHERE cache_hit = true)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1)
  FROM public.ai_cost_log
  WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY created_at::date
  ORDER BY created_at::date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_ai_cost_summary(INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_ai_cost_summary(INT) TO authenticated;

GRANT SELECT ON public.ai_cost_daily TO service_role;
GRANT SELECT ON public.ai_agent_accuracy TO service_role;
GRANT SELECT ON public.ai_cost_daily TO authenticated;
GRANT SELECT ON public.ai_agent_accuracy TO authenticated;