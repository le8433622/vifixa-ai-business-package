-- Price accuracy feedback loop for AI Chat Service Closer quotes.

CREATE TABLE IF NOT EXISTS public.ai_price_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL UNIQUE,
  chat_session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  estimated_price NUMERIC NOT NULL,
  actual_price NUMERIC NOT NULL,
  final_price NUMERIC,
  mismatch_amount NUMERIC NOT NULL,
  mismatch_percent NUMERIC NOT NULL,
  mismatch_severity TEXT NOT NULL CHECK (mismatch_severity IN ('accurate', 'minor', 'moderate', 'major')),
  mismatch_direction TEXT NOT NULL CHECK (mismatch_direction IN ('underpriced', 'overpriced', 'accurate')),
  mismatch_reason TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_price_feedback_chat_session
  ON public.ai_price_feedback(chat_session_id);
CREATE INDEX IF NOT EXISTS idx_ai_price_feedback_category
  ON public.ai_price_feedback(category);
CREATE INDEX IF NOT EXISTS idx_ai_price_feedback_severity
  ON public.ai_price_feedback(mismatch_severity, created_at DESC);

CREATE OR REPLACE FUNCTION public.price_feedback_severity(mismatch_percent NUMERIC)
RETURNS TEXT AS $$
BEGIN
  IF mismatch_percent <= 0.10 THEN
    RETURN 'accurate';
  ELSIF mismatch_percent <= 0.20 THEN
    RETURN 'minor';
  ELSIF mismatch_percent <= 0.40 THEN
    RETURN 'moderate';
  END IF;
  RETURN 'major';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.refresh_ai_price_feedback_for_order(target_order_id UUID)
RETURNS VOID AS $$
DECLARE
  order_row RECORD;
  realized_price NUMERIC;
  mismatch_amount_value NUMERIC;
  mismatch_percent_value NUMERIC;
  mismatch_direction_value TEXT;
BEGIN
  SELECT
    id,
    chat_session_id,
    category,
    estimated_price,
    actual_price,
    final_price,
    status,
    ai_diagnosis
  INTO order_row
  FROM public.orders
  WHERE id = target_order_id;

  IF order_row.id IS NULL THEN
    RETURN;
  END IF;

  realized_price := COALESCE(order_row.actual_price, order_row.final_price);

  IF order_row.chat_session_id IS NULL
     OR order_row.status <> 'completed'
     OR order_row.estimated_price IS NULL
     OR order_row.estimated_price <= 0
     OR realized_price IS NULL
     OR realized_price <= 0 THEN
    DELETE FROM public.ai_price_feedback WHERE order_id = target_order_id;
    RETURN;
  END IF;

  mismatch_amount_value := realized_price - order_row.estimated_price;
  mismatch_percent_value := ABS(mismatch_amount_value) / order_row.estimated_price;

  IF mismatch_amount_value > 0 THEN
    mismatch_direction_value := 'underpriced';
  ELSIF mismatch_amount_value < 0 THEN
    mismatch_direction_value := 'overpriced';
  ELSE
    mismatch_direction_value := 'accurate';
  END IF;

  INSERT INTO public.ai_price_feedback (
    order_id,
    chat_session_id,
    category,
    estimated_price,
    actual_price,
    final_price,
    mismatch_amount,
    mismatch_percent,
    mismatch_severity,
    mismatch_direction,
    mismatch_reason,
    metadata,
    updated_at
  )
  VALUES (
    order_row.id,
    order_row.chat_session_id,
    order_row.category,
    order_row.estimated_price,
    realized_price,
    order_row.final_price,
    mismatch_amount_value,
    mismatch_percent_value,
    public.price_feedback_severity(mismatch_percent_value),
    mismatch_direction_value,
    CASE
      WHEN ABS(mismatch_amount_value) = 0 THEN 'price_matched_estimate'
      WHEN mismatch_amount_value > 0 THEN 'final_price_above_ai_estimate'
      ELSE 'final_price_below_ai_estimate'
    END,
    jsonb_build_object(
      'source', 'orders_completed_trigger',
      'ai_diagnosis', order_row.ai_diagnosis
    ),
    NOW()
  )
  ON CONFLICT (order_id) DO UPDATE SET
    chat_session_id = EXCLUDED.chat_session_id,
    category = EXCLUDED.category,
    estimated_price = EXCLUDED.estimated_price,
    actual_price = EXCLUDED.actual_price,
    final_price = EXCLUDED.final_price,
    mismatch_amount = EXCLUDED.mismatch_amount,
    mismatch_percent = EXCLUDED.mismatch_percent,
    mismatch_severity = EXCLUDED.mismatch_severity,
    mismatch_direction = EXCLUDED.mismatch_direction,
    mismatch_reason = COALESCE(public.ai_price_feedback.mismatch_reason, EXCLUDED.mismatch_reason),
    metadata = public.ai_price_feedback.metadata || EXCLUDED.metadata,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_ai_price_feedback_order_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.refresh_ai_price_feedback_for_order(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS refresh_ai_price_feedback_on_orders ON public.orders;
CREATE TRIGGER refresh_ai_price_feedback_on_orders
  AFTER INSERT OR UPDATE OF status, estimated_price, actual_price, final_price, chat_session_id, category, ai_diagnosis
  ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_ai_price_feedback_order_change();

CREATE OR REPLACE VIEW public.chat_price_accuracy_daily AS
SELECT
  created_at::date AS day,
  COUNT(*)::INTEGER AS completed_chat_orders,
  ROUND(AVG(mismatch_percent), 4) AS avg_mismatch_percent,
  ROUND(AVG(ABS(mismatch_amount)), 0) AS avg_abs_mismatch_amount,
  COUNT(*) FILTER (WHERE mismatch_severity = 'accurate')::INTEGER AS accurate_orders,
  COUNT(*) FILTER (WHERE mismatch_severity = 'minor')::INTEGER AS minor_mismatch_orders,
  COUNT(*) FILTER (WHERE mismatch_severity = 'moderate')::INTEGER AS moderate_mismatch_orders,
  COUNT(*) FILTER (WHERE mismatch_severity = 'major')::INTEGER AS major_mismatch_orders,
  ROUND(
    COUNT(*) FILTER (WHERE mismatch_severity IN ('accurate', 'minor'))::NUMERIC / NULLIF(COUNT(*), 0),
    4
  ) AS acceptable_accuracy_rate
FROM public.ai_price_feedback
GROUP BY created_at::date
ORDER BY day DESC;

CREATE OR REPLACE VIEW public.chat_price_accuracy_by_category AS
SELECT
  category,
  COUNT(*)::INTEGER AS completed_chat_orders,
  ROUND(AVG(mismatch_percent), 4) AS avg_mismatch_percent,
  ROUND(AVG(ABS(mismatch_amount)), 0) AS avg_abs_mismatch_amount,
  COUNT(*) FILTER (WHERE mismatch_direction = 'underpriced')::INTEGER AS underpriced_orders,
  COUNT(*) FILTER (WHERE mismatch_direction = 'overpriced')::INTEGER AS overpriced_orders,
  COUNT(*) FILTER (WHERE mismatch_severity = 'major')::INTEGER AS major_mismatch_orders,
  ROUND(
    COUNT(*) FILTER (WHERE mismatch_severity IN ('accurate', 'minor'))::NUMERIC / NULLIF(COUNT(*), 0),
    4
  ) AS acceptable_accuracy_rate
FROM public.ai_price_feedback
GROUP BY category
ORDER BY completed_chat_orders DESC, avg_mismatch_percent DESC;

ALTER TABLE public.ai_price_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage AI price feedback"
  ON public.ai_price_feedback FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

GRANT SELECT ON public.ai_price_feedback TO authenticated;
GRANT ALL ON public.ai_price_feedback TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_ai_price_feedback_for_order(UUID) TO service_role;
GRANT SELECT ON public.chat_price_accuracy_daily TO service_role;
GRANT SELECT ON public.chat_price_accuracy_by_category TO service_role;
