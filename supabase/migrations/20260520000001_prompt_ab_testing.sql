-- Prompt A/B Testing Framework
-- Extends ai_prompts with experiment tracking

CREATE TABLE IF NOT EXISTS public.prompt_ab_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_name TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  description TEXT,
  variant_a_prompt_id UUID REFERENCES public.ai_prompts(id) NOT NULL,
  variant_b_prompt_id UUID REFERENCES public.ai_prompts(id) NOT NULL,
  traffic_split INTEGER DEFAULT 50,
  min_sample_size INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  winning_variant TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prompt_ab_active ON public.prompt_ab_tests(agent_type, is_active) WHERE is_active = true;

ALTER TABLE public.prompt_ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage prompt AB tests" ON public.prompt_ab_tests
  FOR ALL USING (is_admin());

CREATE POLICY "Service role can manage prompt AB tests" ON public.prompt_ab_tests
  FOR ALL USING (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.prompt_ab_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID REFERENCES public.prompt_ab_tests(id) ON DELETE CASCADE NOT NULL,
  variant TEXT NOT NULL CHECK (variant IN ('variant_a', 'variant_b')),
  total_calls INT DEFAULT 0,
  total_tokens_in INT DEFAULT 0,
  total_tokens_out INT DEFAULT 0,
  total_cost NUMERIC(10,6) DEFAULT 0,
  avg_latency_ms INT DEFAULT 0,
  correct_count INT DEFAULT 0,
  incorrect_count INT DEFAULT 0,
  total_feedback INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(test_id, variant)
);

CREATE INDEX IF NOT EXISTS idx_prompt_ab_results_test ON public.prompt_ab_results(test_id);

ALTER TABLE public.prompt_ab_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view prompt AB results" ON public.prompt_ab_results
  FOR SELECT USING (is_admin());

CREATE POLICY "Service role can manage prompt AB results" ON public.prompt_ab_results
  FOR ALL USING (auth.role() = 'service_role');

GRANT ALL ON public.prompt_ab_tests, public.prompt_ab_results TO service_role;
GRANT SELECT ON public.prompt_ab_tests, public.prompt_ab_results TO authenticated;

CREATE OR REPLACE FUNCTION public.calculate_prompt_ab_significance(p_test_id UUID)
RETURNS TABLE (
  variant TEXT,
  total_calls INT,
  accuracy_pct NUMERIC,
  avg_cost NUMERIC,
  avg_latency_ms INT,
  is_winner BOOLEAN,
  confidence_pct NUMERIC
) AS $$
DECLARE
  r_a RECORD; r_b RECORD;
  a_acc NUMERIC; b_acc NUMERIC;
  a_cost NUMERIC; b_cost NUMERIC;
  se NUMERIC; z_score NUMERIC;
  confidence NUMERIC;
BEGIN
  SELECT * INTO r_a FROM public.prompt_ab_results WHERE test_id = p_test_id AND variant = 'variant_a';
  SELECT * INTO r_b FROM public.prompt_ab_results WHERE test_id = p_test_id AND variant = 'variant_b';

  IF NOT FOUND THEN RETURN; END IF;

  a_acc := CASE WHEN r_a.total_feedback > 0 THEN r_a.correct_count::NUMERIC / r_a.total_feedback ELSE 0 END;
  b_acc := CASE WHEN r_b.total_feedback > 0 THEN r_b.correct_count::NUMERIC / r_b.total_feedback ELSE 0 END;
  a_cost := CASE WHEN r_a.total_calls > 0 THEN r_a.total_cost / r_a.total_calls ELSE 0 END;

  se := sqrt((a_acc * (1 - a_acc) / GREATEST(r_a.total_feedback, 1)) + (b_acc * (1 - b_acc) / GREATEST(r_b.total_feedback, 1)));
  z_score := CASE WHEN se > 0 THEN ABS(a_acc - b_acc) / se ELSE 0 END;
  confidence := LEAST(1.0, CASE WHEN z_score >= 3.0 THEN 0.999 WHEN z_score >= 2.58 THEN 0.99 WHEN z_score >= 1.96 THEN 0.95 WHEN z_score >= 1.65 THEN 0.90 ELSE z_score / 3.0 END);

  RETURN QUERY
  SELECT 'variant_a'::TEXT, r_a.total_calls, ROUND(a_acc * 100, 1), ROUND(a_cost::NUMERIC, 6), r_a.avg_latency_ms,
    CASE WHEN a_acc > b_acc AND confidence >= 0.95 THEN true ELSE false END,
    ROUND(confidence * 100, 1)
  UNION ALL
  SELECT 'variant_b'::TEXT, r_b.total_calls, ROUND(b_acc * 100, 1), ROUND((CASE WHEN r_b.total_calls > 0 THEN r_b.total_cost / r_b.total_calls ELSE 0 END)::NUMERIC, 6), r_b.avg_latency_ms,
    CASE WHEN b_acc > a_acc AND confidence >= 0.95 THEN true ELSE false END,
    ROUND(confidence * 100, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.calculate_prompt_ab_significance(UUID) TO service_role;