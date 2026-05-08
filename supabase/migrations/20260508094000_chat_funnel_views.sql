-- Chat funnel analytics views for the AI Chat Service Closer admin dashboard.

CREATE OR REPLACE VIEW public.chat_funnel_daily AS
WITH daily_sessions AS (
  SELECT
    created_at::date AS day,
    session_id,
    array_agg(DISTINCT event_type) AS event_types
  FROM public.chat_events
  GROUP BY created_at::date, session_id
)
SELECT
  day,
  COUNT(*)::INTEGER AS total_sessions,
  COUNT(*) FILTER (WHERE 'chat_started' = ANY(event_types))::INTEGER AS started_sessions,
  COUNT(*) FILTER (WHERE 'slot_updated' = ANY(event_types))::INTEGER AS qualified_sessions,
  COUNT(*) FILTER (WHERE 'quote_shown' = ANY(event_types))::INTEGER AS quoted_sessions,
  COUNT(*) FILTER (WHERE 'confirmation_shown' = ANY(event_types))::INTEGER AS confirmation_shown_sessions,
  COUNT(*) FILTER (WHERE 'confirmation_clicked' = ANY(event_types))::INTEGER AS confirmation_clicked_sessions,
  COUNT(*) FILTER (WHERE 'approval_requested' = ANY(event_types))::INTEGER AS approval_requested_sessions,
  COUNT(*) FILTER (WHERE 'order_created' = ANY(event_types))::INTEGER AS order_created_sessions,
  COUNT(*) FILTER (WHERE 'escalated' = ANY(event_types))::INTEGER AS escalated_sessions,
  ROUND(
    COUNT(*) FILTER (WHERE 'order_created' = ANY(event_types))::NUMERIC
    / NULLIF(COUNT(*) FILTER (WHERE 'chat_started' = ANY(event_types)), 0),
    4
  ) AS chat_to_order_rate,
  ROUND(
    COUNT(*) FILTER (WHERE 'escalated' = ANY(event_types))::NUMERIC
    / NULLIF(COUNT(*), 0),
    4
  ) AS escalation_rate
FROM daily_sessions
GROUP BY day
ORDER BY day DESC;

CREATE OR REPLACE VIEW public.chat_dropoff_by_missing_slot AS
SELECT
  created_at::date AS day,
  missing_slot,
  COUNT(*)::INTEGER AS occurrences,
  COUNT(DISTINCT session_id)::INTEGER AS sessions
FROM public.chat_events
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(metadata->'missing_slots', '[]'::jsonb)) AS missing_slot
WHERE event_type = 'slot_updated'
GROUP BY created_at::date, missing_slot
ORDER BY day DESC, occurrences DESC;

CREATE OR REPLACE VIEW public.chat_quote_acceptance AS
WITH daily_sessions AS (
  SELECT
    created_at::date AS day,
    session_id,
    array_agg(DISTINCT event_type) AS event_types
  FROM public.chat_events
  GROUP BY created_at::date, session_id
)
SELECT
  day,
  COUNT(*) FILTER (WHERE 'quote_shown' = ANY(event_types))::INTEGER AS quoted_sessions,
  COUNT(*) FILTER (WHERE 'confirmation_clicked' = ANY(event_types))::INTEGER AS confirmation_clicked_sessions,
  COUNT(*) FILTER (WHERE 'order_created' = ANY(event_types))::INTEGER AS order_created_sessions,
  ROUND(
    COUNT(*) FILTER (WHERE 'confirmation_clicked' = ANY(event_types))::NUMERIC
    / NULLIF(COUNT(*) FILTER (WHERE 'quote_shown' = ANY(event_types)), 0),
    4
  ) AS quote_to_confirm_rate,
  ROUND(
    COUNT(*) FILTER (WHERE 'order_created' = ANY(event_types))::NUMERIC
    / NULLIF(COUNT(*) FILTER (WHERE 'quote_shown' = ANY(event_types)), 0),
    4
  ) AS quote_to_order_rate
FROM daily_sessions
GROUP BY day
ORDER BY day DESC;

CREATE OR REPLACE VIEW public.chat_ai_fallback_rate AS
WITH daily_sessions AS (
  SELECT
    created_at::date AS day,
    session_id,
    BOOL_OR(metadata->'risk_flags' ? 'ai_fallback') AS had_ai_fallback
  FROM public.chat_events
  GROUP BY created_at::date, session_id
)
SELECT
  day,
  COUNT(*)::INTEGER AS total_sessions,
  COUNT(*) FILTER (WHERE had_ai_fallback)::INTEGER AS fallback_sessions,
  ROUND(
    COUNT(*) FILTER (WHERE had_ai_fallback)::NUMERIC / NULLIF(COUNT(*), 0),
    4
  ) AS fallback_rate
FROM daily_sessions
GROUP BY day
ORDER BY day DESC;

GRANT SELECT ON public.chat_funnel_daily TO service_role;
GRANT SELECT ON public.chat_dropoff_by_missing_slot TO service_role;
GRANT SELECT ON public.chat_quote_acceptance TO service_role;
GRANT SELECT ON public.chat_ai_fallback_rate TO service_role;
