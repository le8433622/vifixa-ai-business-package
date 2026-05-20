-- Income Commerce OS smoke test
-- Run only on staging/dev.
-- Change the email in the first CTE to a staging user.

with u as (
  select id as owner_id
  from auth.users
  where email = 'customer.test18@vifixa.test'
  limit 1
), src as (
  insert into public.income_sources (partner_id, type, title, description, capabilities, status)
  select owner_id, 'asset', '[SMOKE] income source', 'Smoke test source', '["smoke"]'::jsonb, 'active'
  from u
  returning id, partner_id
), offer as (
  insert into public.commerce_offers (partner_id, income_source_id, title, description, target_customer, price_amount, currency, cost_estimate, status)
  select partner_id, id, '[SMOKE] profitable offer', 'Smoke test offer', 'test users', 1000000, 'VND', '{"cogs":500000,"adSpend":100000}'::jsonb, 'testing'
  from src
  returning id, partner_id
), exp as (
  insert into public.commerce_experiments (owner_id, offer_id, name, hypothesis, channel, budget_limit, status, started_at)
  select partner_id, id, '[SMOKE] positive experiment', 'Smoke positive profit hypothesis', 'smoke', 100000, 'running', now()
  from offer
  returning id, owner_id, offer_id
), profit as (
  insert into public.profit_records (owner_id, offer_id, experiment_id, revenue, total_cost, net_profit, profit_margin, currency, breakdown, confidence, metrics)
  select owner_id, offer_id, id, 1000000, 600000, 400000, 0.4, 'VND', '[{"key":"cogs","amount":500000},{"key":"adSpend","amount":100000}]'::jsonb, 0.9, '{"paidOrders":1}'::jsonb
  from exp
  returning id, owner_id, offer_id, experiment_id, net_profit
), decision as (
  insert into public.commerce_decisions (owner_id, offer_id, experiment_id, decision, reason, risk_score, expected_net_profit, confidence, created_by)
  select owner_id, offer_id, experiment_id, 'scale', 'Smoke positive profit decision', 0.1, 400000, 0.9, 'ai'
  from profit
  returning id
)
select
  profit.id as profit_record_id,
  decision.id as decision_id,
  profit.net_profit,
  'PASS' as smoke_result
from profit, decision;
