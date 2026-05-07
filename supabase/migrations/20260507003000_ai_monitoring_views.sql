-- AI Monitoring Views
-- Deploy: supabase db push --linked

-- 1. AI Health Dashboard: error rate, latency, requests per agent
create or replace view v_ai_health_dashboard as
select
  agent_type,
  count(*)::int as total_requests,
  count(*) filter (where output ? 'error')::int as error_count,
  round(
    count(*) filter (where output ? 'error')::numeric / nullif(count(*), 0) * 100, 2
  ) as error_rate_pct,
  round(avg(coalesce((output->>'confidence')::numeric, 0)), 2) as avg_confidence,
  min(created_at) as first_request,
  max(created_at) as last_request
from ai_logs
where created_at > now() - interval '7 days'
group by agent_type
order by error_rate_pct desc;

-- 2. Recent errors (last 24h) for alerting
create or replace view v_ai_recent_errors as
select
  id,
  agent_type,
  user_id,
  created_at,
  (output->>'error')::text as error_message,
  output as full_output
from ai_logs
where
  output ? 'error'
  and created_at > now() - interval '24 hours'
order by created_at desc;

-- 3. Rate limit hits (requests returning 429 / high frequency per user)
create or replace view v_ai_rate_limit_monitor as
select
  user_id,
  agent_type,
  count(*)::int as request_count,
  min(created_at) as first_req,
  max(created_at) as last_req,
  round(extract(epoch from max(created_at) - min(created_at))::numeric, 1) as span_seconds,
  case
    when count(*) > 50 and extract(epoch from max(created_at) - min(created_at)) < 60 then 'CRITICAL'
    when count(*) > 20 and extract(epoch from max(created_at) - min(created_at)) < 60 then 'WARNING'
    else 'OK'
  end as rate_status
from ai_logs
where created_at > now() - interval '1 hour'
group by user_id, agent_type
having count(*) > 10
order by request_count desc;

-- 4. Hourly usage breakdown (for billing/capacity)
create or replace view v_ai_hourly_usage as
select
  date_trunc('hour', created_at) as hour,
  agent_type,
  count(*)::int as requests,
  count(distinct user_id)::int as unique_users
from ai_logs
where created_at > now() - interval '7 days'
group by 1, 2
order by 1 desc, 3 desc;

-- 5. User-level AI usage (top users)
create or replace view v_ai_top_users as
select
  user_id,
  count(*)::int as total_requests,
  count(distinct agent_type)::int as agents_used,
  max(created_at) as last_active
from ai_logs
where created_at > now() - interval '30 days'
group by user_id
order by total_requests desc
limit 100;
